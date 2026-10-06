'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '@/api/userApi';
import { getResourceList } from '@/api/adminResourceApi';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import StatCard from '@/components/ui/StatCard';
import ImageUpload from '@/components/ImageUpload';
import Pagination from '@/components/Pagination';
import { resolveImageUrl } from '@/api/api';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';

import type {
  User,
  UserRequest,
  UserStatus,
  UserUpdateRequest,
} from '@/interfaces/user';
import type { ResourceRow } from '@/interfaces/adminResources';

const emptyForm: UserRequest = {
  roleId: 0,
  fullName: '',
  email: '',
  phone: '',
  password: '',
  avatarUrl: '',
  status: 'ACTIVE',
};

const pageSize = 15;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<ResourceRow[]>([]);
  const [form, setForm] = useState<UserRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredUsers = users.filter((user) =>
    matchesSearch(
      [
        user.id,
        user.full_name,
        user.email,
        user.phone,
        user.role_name,
        user.status,
      ],
      search,
    ) &&
    (statusFilter === '' || user.status === statusFilter),
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visiblePagination = {
    page: currentPage,
    limit: pageSize,
    total: filteredUsers.length,
    totalPages,
  };

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      setUsers(await getUsers());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getUsers()
      .then((result) => {
        if (active) setUsers(result);
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
  }, []);

  useEffect(() => {
    getResourceList('/api/roles')
      .then(setRoles)
      .catch((loadError: unknown) => setError(getErrorMessage(loadError)));
  }, []);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
    setError('');
  }

  function openEdit(user: User) {
    setEditingId(user.id);

    setForm({
      roleId: user.role_id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      avatarUrl: user.avatar_url || '',
      status: user.status,
    });

    setFormOpen(true);
    setError('');
  }

  function updateField<K extends keyof UserRequest>(
    field: K,
    value: UserRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadingImage) return;

    if (!form.fullName.trim() || !form.email.trim() || form.roleId <= 0) {
      setError('Họ tên, email và ID vai trò là bắt buộc.');
      setError('Họ tên, email và vai trò là bắt buộc.');
      return;
    }

    if (editingId === null && !form.password) {
      setError('Mật khẩu là bắt buộc khi tạo người dùng.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
      };

      if (editingId === null) {
        await createUser(payload);

        setNotice('Đã thêm người dùng thành công.');
      } else {
        const updatePayload: UserUpdateRequest = {
          ...payload,
        };

        if (!updatePayload.password) {
          delete updatePayload.password;
        }

        await updateUser(editingId, updatePayload);

        setNotice('Đã cập nhật người dùng thành công.');
      }

      closeForm();
      const targetPage = editingId === null ? 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await loadUsers();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;

    setSaving(true);
    setError('');

    try {
      await deleteUser(deletingUser.id);

      setDeletingUser(null);

      setNotice('Đã xóa người dùng.');

      await loadUsers();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] text-slate-900">
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Quản trị hệ thống</p>

            <h2 className="mt-1 text-xl font-bold">Danh sách người dùng</h2>
          </div>

          <Button type="button" onClick={openCreate}>
            + Thêm người dùng
          </Button>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="Tổng người dùng" value={users.length} />
        </div>

        {/* Alerts */}
        {notice && (
          <Alert
            message={notice}
            type="success"
            onClose={() => setNotice('')}
          />
        )}

        {error && (
          <Alert message={error} type="error" onClose={() => setError('')} />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm người dùng theo tên, email, điện thoại..."
          />
          <label className="mb-4 block">
            <span className="sr-only">Lọc theo trạng thái hoạt động</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 sm:min-w-52"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
            </select>
          </label>
        </div>

        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải danh sách...
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-bold">
                {search || statusFilter
                  ? 'Không tìm thấy người dùng phù hợp'
                  : 'Chưa có người dùng nào'}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Tạo người dùng đầu tiên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Người dùng</th>

                    <th className="px-5 py-3 font-semibold">
                      Email / điện thoại
                    </th>

                    <th className="px-5 py-3 font-semibold">ID vai trò</th>

                    <th className="px-5 py-3 font-semibold">Trạng thái</th>

                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={resolveImageUrl(user.avatar_url)}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 font-bold text-cyan-700">
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <p className="font-bold">{user.full_name}</p>

                            <p className="text-xs text-slate-500">#{user.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p>{user.email}</p>

                        <p className="text-xs text-slate-500">
                          {user.phone || 'Chưa có số điện thoại'}
                        </p>
                      </td>

                      <td className="px-5 py-4">{user.role_name}</td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <UserStatusBadge status={user.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="mr-3 font-semibold text-cyan-700 hover:text-cyan-900"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingUser(user)}
                          className="font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Xóa
                        </button>
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
      </main>

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        title={editingId === null ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'}
        onClose={closeForm}
      >
        <UserForm
          form={form}
          roles={roles}
          editing={editingId !== null}
          saving={saving}
          uploadingImage={uploadingImage}
          onUploadError={setError}
          onUploadingChange={setUploadingImage}
          onChange={updateField}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deletingUser}
        title="Xác nhận xóa"
        onClose={() => setDeletingUser(null)}
      >
        <div>
          <p className="text-sm text-slate-600">
            Bạn có chắc muốn xóa người dùng{' '}
            <strong>{deletingUser?.full_name}</strong> không?
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingUser(null)}
            >
              Hủy
            </Button>

            <Button
              type="button"
              variant="danger"
              loading={saving}
              onClick={() => void handleDelete()}
            >
              Xóa người dùng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* =========================
   User Status Badge
========================= */

function UserStatusBadge({ status }: { status: UserStatus }) {
  const labels: Record<UserStatus, string> = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Không hoạt động',
    BLOCKED: 'Bị khóa',
  };

  const variants: Record<UserStatus, 'success' | 'default' | 'danger'> = {
    ACTIVE: 'success',
    INACTIVE: 'default',
    BLOCKED: 'danger',
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

/* =========================
   User Form
========================= */

interface UserFormProps {
  form: UserRequest;
  roles: ResourceRow[];
  editing: boolean;
  saving: boolean;
  uploadingImage: boolean;
  onUploadError: (message: string) => void;
  onUploadingChange: (uploading: boolean) => void;

  onChange: <K extends keyof UserRequest>(
    field: K,
    value: UserRequest[K],
  ) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  onCancel: () => void;
}

function UserForm({
  form,
  roles,
  editing,
  saving,
  uploadingImage,
  onUploadError,
  onUploadingChange,
  onChange,
  onSubmit,
  onCancel,
}: UserFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="max-h-[80vh] space-y-4 overflow-y-auto"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="full-name"
          label="Họ và tên"
          value={form.fullName}
          onChange={(event) => onChange('fullName', event.target.value)}
          required
          maxLength={150}
        />

        <Select
          id="role-id"
          label="Vai trò"
          value={form.roleId || ''}
          onChange={(event) => onChange('roleId', Number(event.target.value))}
          required
          options={[
            { label: 'Chọn vai trò', value: '' },
            ...roles.map((role) => ({
              label: String(role.name || role.id),
              value: role.id,
            })),
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => onChange('email', event.target.value)}
          required
          maxLength={150}
        />

        <Input
          id="phone"
          label="Số điện thoại"
          value={form.phone}
          onChange={(event) => onChange('phone', event.target.value)}
          maxLength={20}
        />
      </div>

      <Input
        id="password"
        label={editing ? 'Mật khẩu mới' : 'Mật khẩu'}
        type="password"
        value={form.password}
        onChange={(event) => onChange('password', event.target.value)}
        required={!editing}
        maxLength={255}
      />

      <ImageUpload
        label="Ảnh đại diện"
        value={form.avatarUrl}
        onChange={(url) => onChange('avatarUrl', url)}
        onError={onUploadError}
        onUploadingChange={onUploadingChange}
      />

      <Select
        id="user-status"
        label="Trạng thái"
        value={form.status}
        onChange={(event) =>
          onChange('status', event.target.value as UserStatus)
        }
        options={[
          {
            value: 'ACTIVE',
            label: 'Đang hoạt động',
          },
          {
            value: 'INACTIVE',
            label: 'Không hoạt động',
          },
          {
            value: 'BLOCKED',
            label: 'Bị khóa',
          },
        ]}
      />

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Hủy
        </Button>

        <Button type="submit" loading={saving || uploadingImage}>
          Lưu người dùng
        </Button>
      </div>
    </form>
  );
}
