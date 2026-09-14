type DateFormat = 'short' | 'long';

const formatters: Record<DateFormat, Intl.DateTimeFormatOptions> = {
	short: { year: 'numeric', month: 'short', day: 'numeric' },
	long: { year: 'numeric', month: 'long', day: 'numeric' },
};

export function formatDate(date: Date | string, format: DateFormat = 'short'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', { ...formatters[format], timeZone: 'UTC' });
}
