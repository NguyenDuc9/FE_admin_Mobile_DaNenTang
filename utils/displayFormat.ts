const groupedNumberFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

export function formatGroupedNumber(value: number | string | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return groupedNumberFormatter.format(number);
}

export function formatVnd(value: number | string | null | undefined) {
  const formatted = formatGroupedNumber(value);
  return formatted === '—' ? formatted : `${formatted} ₫`;
}

export function formatDateTime(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value).trim();
  const localDateTime = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localDateTime) {
    const [, year, month, day, hours, minutes] = localDateTime;
    return hours
      ? `${day}/${month}/${year} ${hours}:${minutes}`
      : `${day}/${month}/${year}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function isDateColumn(name: string) {
  return /(?:^|_)(?:date|at|time)$/.test(name);
}

export function isCurrencyColumn(name: string) {
  return /(?:price|amount|revenue|subtotal|total|discount|fee|cost|value)$/i.test(
    name,
  );
}

export function isNumericColumn(name: string, value: unknown) {
  if (isDateColumn(name)) return false;
  if (typeof value === 'number') return true;
  return (
    /^-?\d+(?:\.\d+)?$/.test(String(value ?? '')) &&
    (isCurrencyColumn(name) ||
      /(?:^id$|_id$|quantity|count|rating|order|rate|months|size|weight)$/i.test(
        name,
      ))
  );
}
