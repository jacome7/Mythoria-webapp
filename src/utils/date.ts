export interface FormatOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

export function formatDate(date: string | Date, options: FormatOptions = {}): string {
  const { locale = 'en-US', ...formatOptions } = options;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}
