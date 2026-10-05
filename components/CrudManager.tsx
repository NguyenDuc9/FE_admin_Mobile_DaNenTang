'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createResource,
  deleteResource,
  getResourcePage,
  getResourceById,
  getResourceList,
  patchResourceStatus,
  updateResource,
} from '@/api/adminResourceApi';
import type {
  ResourceDefinition,
  ResourceField,
  ResourceRow,
} from '@/interfaces/adminResources';
import Modal from '@/components/Modal';
import ImageUpload from '@/components/ImageUpload';
import Pagination from '@/components/Pagination';
import { resolveImageUrl } from '@/api/api';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import {
  formatDateTime,
  formatGroupedNumber,
  formatVnd,
  isCurrencyColumn,
  isDateColumn,
  isNumericColumn,
} from '@/utils/displayFormat';
import { getAdminValueLabel } from '@/utils/adminValueLabels';

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function defaultValue(field: ResourceField) {
  if (field.default !== undefined) return field.default;
  if (field.type === 'number') return 0;
  if (field.type === 'checkbox') return false;
  if (field.type === 'json' || field.type === 'template-items') return '[]';
  if (field.type === 'select') return field.options?.[0]?.value || '';
  return '';
}

function formValue(field: ResourceField, row: ResourceRow) {
  const value = row[field.source || field.name] ?? defaultValue(field);
  if (field.serializeFrom) return field.serializeFrom(value);
  if (field.type === 'json') return JSON.stringify(value, null, 2);
  if (field.type !== 'datetime-local' || typeof value !== 'string')
    return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function displayValue(name: string, value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    typeof value === 'boolean'
  ) {
    return getAdminValueLabel(name, value);
  }
  if (isDateColumn(name)) return formatDateTime(value);
  if (isCurrencyColumn(name)) return formatVnd(String(value));
  if (isNumericColumn(name, value)) return formatGroupedNumber(String(value));
  return getAdminValueLabel(name, value);
}

export default function CrudManager({
  definition,
  rowAction,
}: {
  definition: ResourceDefinition;
  rowAction?: {
    label: string;
    onClick: (row: ResourceRow) => void;
  };
}) {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [relationOptions, setRelationOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [lookupRows, setLookupRows] = useState<Record<string, ResourceRow[]>>(
    {},
  );
  const [form, setForm] = useState<Record<string, string | number | boolean>>(
    {},
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingRow, setDeletingRow] = useState<ResourceRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const usesServerSearch = definition.endpoint.startsWith('/api/admin-fe/');
  const filteredRows = usesServerSearch
    ? rows
    : rows.filter((row) =>
        matchesSearch(
          [
            ...Object.values(row),
            ...definition.fields.flatMap((field) => {
              const value = row[field.source || field.name];
              const option = relationOptions[field.name]?.find(
                (item) => item.value === String(value),
              );
              return option ? [option.label] : [];
            }),
          ],
          search,
        ),
      );
  const totalLocalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pagination.limit),
  );
  const visibleRows = usesServerSearch
    ? rows
    : filteredRows.slice(
        (page - 1) * pagination.limit,
        page * pagination.limit,
      );
  const visiblePagination = usesServerSearch
    ? pagination
    : {
        ...pagination,
        page,
        total: filteredRows.length,
        totalPages: totalLocalPages,
      };

  async function loadRows() {
    setError('');
    try {
      if (usesServerSearch) {
        const result = await getResourcePage(
          definition.endpoint,
          page,
          debouncedSearch,
        );
        if (page > 1 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
          return;
        }
        setRows(result.rows);
        setPagination(result.pagination);
      } else {
        const result = await getResourceList(definition.endpoint);
        setRows(result);
        const matchingRows = result.filter((row) =>
          matchesSearch(
            [
              ...Object.values(row),
              ...definition.fields.flatMap((field) => {
                const value = row[field.source || field.name];
                const option = relationOptions[field.name]?.find(
                  (item) => item.value === String(value),
                );
                return option ? [option.label] : [];
              }),
            ],
            search,
          ),
        );
        const nextPage = Math.min(
          page,
          Math.max(1, Math.ceil(matchingRows.length / pagination.limit)),
        );
        setPage(nextPage);
        setPagination({
          page: nextPage,
          limit: pagination.limit,
          total: matchingRows.length,
          totalPages: Math.max(
            1,
            Math.ceil(matchingRows.length / pagination.limit),
          ),
        });
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (usesServerSearch) return;
    let active = true;
    getResourceList(definition.endpoint)
      .then((result) => {
        if (!active) return;
        setRows(result);
        setPagination({
          page: 1,
          limit: 15,
          total: result.length,
          totalPages: Math.max(1, Math.ceil(result.length / 15)),
        });
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [definition.endpoint, usesServerSearch]);

  useEffect(() => {
    if (!usesServerSearch) return;
    let active = true;
    getResourcePage(definition.endpoint, page, debouncedSearch)
      .then((result) => {
        if (!active) return;
        if (page > 1 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
          return;
        }
        setRows(result.rows);
        setPagination(result.pagination);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [definition.endpoint, page, debouncedSearch, usesServerSearch]);

  useEffect(() => {
    const fields = definition.fields.filter((field) => field.optionsEndpoint);
    const lookups = definition.lookups || [];
    const endpoints = [
      ...new Set([
        ...fields.map((field) => field.optionsEndpoint!),
        ...lookups.map((lookup) => lookup.endpoint),
      ]),
    ];
    if (endpoints.length === 0) return;

    Promise.all(
      endpoints.map(
        async (endpoint) =>
          [endpoint, await getResourceList(endpoint)] as const,
      ),
    )
      .then((results) => {
        const rowsByEndpoint = new Map(results);
        setLookupRows(
          Object.fromEntries(
            lookups.map((lookup) => [
              lookup.name,
              rowsByEndpoint.get(lookup.endpoint) || [],
            ]),
          ),
        );
        const options = Object.fromEntries(
          fields.map((field) => {
            const relatedRows =
              rowsByEndpoint.get(field.optionsEndpoint!) || [];
            return [
              field.name,
              relatedRows.map((relatedRow) => ({
                value: String(
                  relatedRow[field.optionValue || 'id'] ?? relatedRow.id,
                ),
                label: String(
                  relatedRow[field.optionLabel || 'name'] ?? relatedRow.id,
                ),
              })),
            ];
          }),
        );
        setRelationOptions(options);
      })
      .catch((loadError: unknown) => {
        setError(getErrorMessage(loadError));
      });
  }, [definition.fields, definition.lookups]);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  function openCreate() {
    setForm(
      Object.fromEntries(
        definition.fields.map((field) => [field.name, defaultValue(field)]),
      ),
    );
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  async function openEdit(row: ResourceRow) {
    setError('');
    try {
      const record = definition.loadOneForEdit
        ? await getResourceById(definition.endpoint, row.id)
        : row;
      setForm(
        Object.fromEntries(
          definition.fields.map((field) => [
            field.name,
            formValue(field, record),
          ]),
        ),
      );
      setEditingId(row.id);
      setFormOpen(true);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {};
      for (const field of definition.fields) {
        payload[field.name] =
          field.type === 'json'
            ? JSON.parse(String(form[field.name] || '[]'))
            : field.type === 'template-items'
              ? JSON.parse(String(form[field.name] || '[]'))
              : field.valueType === 'number'
                ? form[field.name] === ''
                  ? null
                  : Number(form[field.name])
                : form[field.name];
      }
      if (editingId === null) {
        await createResource(definition.endpoint, payload);
        setNotice(`Đã thêm ${definition.title.toLowerCase()} thành công.`);
      } else {
        await updateResource(
          definition.endpoint,
          editingId,
          payload,
          definition.updateMethod,
        );
        setNotice(`Đã cập nhật ${definition.title.toLowerCase()} thành công.`);
      }
      closeForm();
      await loadRows();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingRow) return;
    setSaving(true);
    setError('');
    try {
      await deleteResource(definition.endpoint, deletingRow.id);
      setDeletingRow(null);
      setNotice(`Đã xóa ${definition.title.toLowerCase()}.`);
      await loadRows();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setDeletingRow(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(row: ResourceRow) {
    if (!definition.statusField) return;
    setSaving(true);
    setError('');
    try {
      const nextStatus =
        row[definition.statusField] === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await patchResourceStatus(definition.endpoint, row.id, nextStatus);
      setNotice(
        `Đã cập nhật trạng thái thành ${getAdminValueLabel('status', nextStatus)}.`,
      );
      await loadRows();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Quản trị cửa hàng</p>
            <h1 className="mt-1 text-2xl font-bold">{definition.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {definition.description}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
          >
            + Thêm mới
          </button>
        </div>

        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={`Tìm ${definition.title.toLocaleLowerCase('vi')}...`}
          />
          <span className="-mt-3 text-sm text-slate-500 sm:mt-0">
            {visiblePagination.total} bản ghi
          </span>
        </div>
        <div className="mb-4 flex justify-end text-sm text-slate-500">
          <button
            type="button"
            onClick={() => void loadRows()}
            className="font-semibold text-cyan-800 hover:text-cyan-950"
          >
            Tải lại
          </button>
        </div>

        {notice && (
          <Message
            type="success"
            message={notice}
            onClose={() => setNotice('')}
          />
        )}
        {error && (
          <Message type="error" message={error} onClose={() => setError('')} />
        )}

        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              {search ? 'Không tìm thấy dữ liệu phù hợp.' : 'Chưa có dữ liệu.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {definition.columns.map((column) => (
                      <th
                        key={column.name}
                        className={`px-5 py-3 font-semibold ${
                          isCurrencyColumn(column.name) ||
                          rows.some((row) =>
                            isNumericColumn(column.name, row[column.name]),
                          )
                            ? 'text-right'
                            : ''
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {definition.columns.map((column) => (
                        <td
                          key={column.name}
                          className={`max-w-xs truncate px-5 py-4 text-slate-700 ${
                            isCurrencyColumn(column.name) ||
                            isNumericColumn(column.name, row[column.name])
                              ? 'text-right tabular-nums'
                              : ''
                          }`}
                        >
                          {(() => {
                            const field = definition.fields.find(
                              (item) => item.name === column.name,
                            );
                            if (
                              field?.type === 'image' &&
                              typeof row[column.name] === 'string' &&
                              row[column.name]
                            ) {
                              return (
                                <img
                                  src={resolveImageUrl(
                                    String(row[column.name]),
                                  )}
                                  alt={field.label}
                                  className="h-12 w-12 rounded-md object-cover"
                                />
                              );
                            }
                            const option = field
                              ? relationOptions[field.name]?.find(
                                  (item) =>
                                    item.value === String(row[column.name]),
                                )
                              : undefined;
                            if (
                              column.name === 'discount_value' &&
                              row.discount_type === 'PERCENT'
                            ) {
                              return `${formatGroupedNumber(
                                String(row[column.name] ?? ''),
                              )}%`;
                            }
                            return (
                              option?.label ||
                              displayValue(column.name, row[column.name])
                            );
                          })()}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {rowAction && (
                          <button
                            type="button"
                            onClick={() => rowAction.onClick(row)}
                            className="mr-4 font-semibold text-indigo-700 hover:text-indigo-900"
                          >
                            {rowAction.label}
                          </button>
                        )}
                        {definition.allowEdit !== false && (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="mr-4 font-semibold text-cyan-800 hover:text-cyan-950"
                          >
                            Sửa
                          </button>
                        )}
                        {definition.statusField && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleStatus(row)}
                            className="mr-4 font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            {row[definition.statusField] === 'ACTIVE'
                              ? 'Ngừng'
                              : 'Kích hoạt'}
                          </button>
                        )}
                        {definition.allowDelete !== false && (
                          <button
                            type="button"
                            onClick={() => setDeletingRow(row)}
                            className="font-semibold text-rose-700 hover:text-rose-900"
                          >
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
      </div>

      {formOpen && (
        <Modal
          title={
            editingId === null
              ? `Thêm ${definition.title.toLowerCase()}`
              : `Sửa ${definition.title.toLowerCase()}`
          }
          onClose={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[78vh] space-y-4 overflow-y-auto p-6"
          >
            {definition.fields.map((field) => {
              const FieldWrapper = field.type === 'image' ? 'div' : 'label';
              return (
                <FieldWrapper
                  key={field.name}
                  className="block text-sm font-semibold text-slate-800"
                >
                  {field.type !== 'image' && (
                    <span className="mb-1.5 block">
                      {field.label}
                      {field.required && (
                        <span className="text-rose-600"> *</span>
                      )}
                    </span>
                  )}
                  {field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(form[field.name])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: event.target.checked,
                        }))
                      }
                      className="ml-2 h-4 w-4 accent-cyan-800"
                    />
                  ) : field.type === 'image' ? (
                    <ImageUpload
                      label={field.label}
                      value={String(form[field.name] ?? '')}
                      required={field.required}
                      onChange={(url) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: url,
                        }))
                      }
                      onError={setError}
                      onUploadingChange={setUploadingImage}
                    />
                  ) : field.type === 'template-items' ? (
                    <TemplateItemsField
                      value={String(form[field.name] ?? '[]')}
                      products={lookupRows.products || []}
                      variants={lookupRows.variants || []}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: value,
                        }))
                      }
                    />
                  ) : field.type === 'textarea' || field.type === 'json' ? (
                    <textarea
                      required={field.required}
                      maxLength={field.maxLength}
                      rows={3}
                      value={String(form[field.name] ?? '')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-700"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={String(form[field.name] ?? '')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-700"
                    >
                      {field.optionsEndpoint && (
                        <option value="">
                          Chọn {field.label.toLowerCase()}
                        </option>
                      )}
                      {(relationOptions[field.name] || field.options || []).map(
                        (option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      maxLength={field.maxLength}
                      value={String(form[field.name] ?? '')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.name]:
                            field.type === 'number'
                              ? event.target.value === ''
                                ? ''
                                : Number(event.target.value)
                              : event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-700"
                    />
                  )}
                </FieldWrapper>
              );
            })}
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : uploadingImage
                    ? 'Đang tải ảnh...'
                    : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingRow && (
        <Modal title="Xác nhận xóa" onClose={() => setDeletingRow(null)}>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa bản ghi #{deletingRow.id} không?
            </p>
            {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

interface TemplateItemValue {
  productId: number;
  productVariantId: number | null;
  componentType: string;
  quantity: number;
  sortOrder: number;
}

function TemplateItemsField({
  value,
  products,
  variants,
  onChange,
}: {
  value: string;
  products: ResourceRow[];
  variants: ResourceRow[];
  onChange: (value: string) => void;
}) {
  let items: TemplateItemValue[] = [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) items = parsed as TemplateItemValue[];
  } catch {
    items = [];
  }

  const updateItem = (index: number, changes: Partial<TemplateItemValue>) => {
    onChange(
      JSON.stringify(
        items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...changes } : item,
        ),
      ),
    );
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const productId = Number(item.productId || 0);
        const productVariants = variants.filter(
          (variant) => Number(variant.product_id) === productId,
        );
        return (
          <div
            key={`${index}-${item.componentType}`}
            className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
          >
            <select
              required
              aria-label="Sản phẩm"
              value={item.productId || ''}
              onChange={(event) =>
                updateItem(index, {
                  productId: Number(event.target.value),
                  productVariantId: null,
                })
              }
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            >
              <option value="">Chọn sản phẩm</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {String(product.name || product.id)}
                </option>
              ))}
            </select>
            <select
              aria-label="Biến thể"
              value={item.productVariantId || ''}
              onChange={(event) =>
                updateItem(index, {
                  productVariantId: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            >
              <option value="">Không chọn biến thể</option>
              {productVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {String(variant.variant_name || variant.sku || variant.id)}
                </option>
              ))}
            </select>
            <select
              required
              aria-label="Loại linh kiện"
              value={item.componentType || ''}
              onChange={(event) =>
                updateItem(index, { componentType: event.target.value })
              }
              className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
            >
              <option value="">Chọn loại linh kiện</option>
              {[
                'CPU',
                'MAINBOARD',
                'RAM',
                'GPU',
                'STORAGE',
                'PSU',
                'CASE',
                'COOLER',
              ].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                required
                aria-label="Số lượng"
                value={item.quantity || 1}
                onChange={(event) =>
                  updateItem(index, { quantity: Number(event.target.value) })
                }
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(JSON.stringify(items.filter((_, i) => i !== index)))
                }
                className="rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700"
              >
                Xóa
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          onChange(
            JSON.stringify([
              ...items,
              {
                productId: 0,
                productVariantId: null,
                componentType: '',
                quantity: 1,
                sortOrder: items.length,
              },
            ]),
          )
        }
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
      >
        + Thêm linh kiện
      </button>
    </div>
  );
}

function Message({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-4 flex justify-between rounded-lg border px-4 py-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  );
}
