'use client';

import { useState } from 'react';
import { resolveImageUrl, uploadImage } from '@/api/api';

export default function ImageUpload({
  label,
  value,
  onChange,
  onError,
  onUploadingChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setUploadError('');
    onError('');
    setUploading(true);
    onUploadingChange?.(true);
    try {
      onChange(await uploadImage(file));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể tải ảnh lên.';
      setUploadError(message);
      onError(message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={resolveImageUrl(value)}
            alt={label}
            className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
            Chưa có ảnh
          </div>
        )}
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          {uploading ? 'Đang tải...' : value ? 'Đổi ảnh' : 'Chọn ảnh'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required={required && !value}
            disabled={uploading}
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
            className="sr-only"
          />
        </label>
        {value && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => onChange('')}
            className="text-sm font-semibold text-rose-700 hover:text-rose-900"
          >
            Gỡ ảnh
          </button>
        )}
      </div>
      {uploadError && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {uploadError}
        </p>
      )}
    </div>
  );
}
