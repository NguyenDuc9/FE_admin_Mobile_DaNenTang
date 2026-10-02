import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = '',
  ...props
}: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}

        {props.required && <span className="text-rose-500"> *</span>}
      </label>

      <input
        {...props}
        id={id}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${className}`}
      />

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
