'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createUser, deleteUser, getUsers, updateUser } from '@/api/userApi';
import Modal from '@/components/Modal';
import type {
  User,
  UserRequest,
  UserStatus,
  UserUpdateRequest,
} from '@/interfaces/user';

const emptyForm: UserRequest = {
  role_id: 0,
  full_name: '',
  email: '',
  phone: '',
  password_hash: '',
  avatar_url: '',
  status: 'ACTIVE',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
      .then((data) => {
        if (active) setUsers(data);
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
      role_id: user.role_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      password_hash: '',
      avatar_url: user.avatar_url || '',
      status: user.status,
    });
    setFormOpen(true);
    setError('');
  }

  function updateField<K extends keyof UserRequest>(
    field: K,
    value: UserRequest[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || form.role_id <= 0) {
      setError('Họ tên, email và ID vai trò là bắt buộc.');
      return;
    }
    if (editingId === null && !form.password_hash) {
      setError('Mật khẩu là bắt buộc khi tạo người dùng.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatar_url: form.avatar_url.trim(),
      };
      if (editingId === null) {
        await createUser(payload);
        setNotice('Đã thêm người dùng thành công.');
      } else {
        const updatePayload: UserUpdateRequest = { ...payload };
        if (!updatePayload.password_hash) delete updatePayload.password_hash;
        await updateUser(editingId, updatePayload);
        setNotice('Đã cập nhật người dùng thành công.');
      }
      closeForm();
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
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Quản trị hệ thống</p>
            <h2 className="mt-1 text-xl font-bold">Danh sách người dùng</h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
          >
            + Thêm người dùng
          </button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Tổng người dùng" value={users.length} />
          <Stat
            label="Đang hoạt động"
            value={users.filter((user) => user.status === 'ACTIVE').length}
            tone="text-emerald-600"
          />
          <Stat
            label="Không hoạt động"
            value={users.filter((user) => user.status === 'INACTIVE').length}
            tone="text-slate-500"
          />
          <Stat
            label="Bị khóa"
            value={users.filter((user) => user.status === 'BLOCKED').length}
            tone="text-rose-600"
          />
        </div>
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
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải danh sách...
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-bold">Chưa có người dùng nào</p>
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
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
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
                      <td className="px-5 py-4">#{user.role_id}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={user.status} />
                      </td>
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
      </main>
      {formOpen && (
        <Modal
          title={
            editingId === null ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'
          }
          onClose={closeForm}
        >
          <UserForm
            form={form}
            editing={editingId !== null}
            saving={saving}
            onChange={updateField}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}
      {deletingUser && (
        <Modal title="Xác nhận xóa" onClose={() => setDeletingUser(null)}>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa người dùng{' '}
              <strong>{deletingUser.full_name}</strong> không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang xóa...' : 'Xóa người dùng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'text-slate-900',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone}`}>
        {value.toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

function Alert({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-5 flex justify-between rounded-xl border px-4 py-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo">
        &times;
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const labels: Record<UserStatus, string> = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Không hoạt động',
    BLOCKED: 'Bị khóa',
  };
  const styles: Record<UserStatus, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    INACTIVE: 'bg-slate-100 text-slate-500',
    BLOCKED: 'bg-rose-50 text-rose-700',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

interface UserFormProps {
  form: UserRequest;
  editing: boolean;
  saving: boolean;
  onChange: <K extends keyof UserRequest>(
    field: K,
    value: UserRequest[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function UserForm({
  form,
  editing,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: UserFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="full-name"
          label="Họ và tên"
          value={form.full_name}
          onChange={(value) => onChange('full_name', value)}
          required
          maxLength={150}
        />
        <NumberField
          id="role-id"
          label="ID vai trò"
          value={form.role_id}
          onChange={(value) => onChange('role_id', value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) => onChange('email', value)}
          required
          maxLength={150}
        />
        <Field
          id="phone"
          label="Số điện thoại"
          value={form.phone}
          onChange={(value) => onChange('phone', value)}
          maxLength={20}
        />
      </div>
      <Field
        id="password"
        label={editing ? 'Mật khẩu mới' : 'Mật khẩu'}
        type="password"
        value={form.password_hash}
        onChange={(value) => onChange('password_hash', value)}
        required={!editing}
        maxLength={255}
      />
      <Field
        id="avatar-url"
        label="URL ảnh đại diện"
        type="url"
        value={form.avatar_url}
        onChange={(value) => onChange('avatar_url', value)}
        maxLength={500}
      />
      <div>
        <label
          htmlFor="user-status"
          className="mb-1.5 block text-sm font-semibold"
        >
          Trạng thái
        </label>
        <select
          id="user-status"
          value={form.status}
          onChange={(event) =>
            onChange('status', event.target.value as UserStatus)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="BLOCKED">Bị khóa</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu người dùng'}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={`user-${id}`}
        className="mb-1.5 block text-sm font-semibold"
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={`user-${id}`}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  required = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={`user-${id}`}
        className="mb-1.5 block text-sm font-semibold"
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={`user-${id}`}
        type="number"
        min="1"
        required={required}
        value={value || ''}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  );
}
