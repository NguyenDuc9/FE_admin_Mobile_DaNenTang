interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  onClose?: () => void;
}

export default function Alert({
  message,
  type = 'success',
  onClose,
}: AlertProps) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div
      className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${styles[type]}`}
    >
      <span>{message}</span>

      {onClose && (
        <button type="button" onClick={onClose} className="ml-4 font-bold">
          ×
        </button>
      )}
    </div>
  );
}
