import { SITE } from '../consts';

type DateFormat = 'short' | 'long';

const formatters: Record<DateFormat, Intl.DateTimeFormatOptions> = {
	short: { year: 'numeric', month: 'short', day: 'numeric' },
	long: { year: 'numeric', month: 'long', day: 'numeric' },
};

export function formatDate(date: Date | string, format: DateFormat = 'short'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	// A fixed zone, not the visitor's: the pre-rendered HTML and the hydrated
	// page have to agree, and the post's own date shouldn't move per reader.
	return d.toLocaleDateString('en-US', { ...formatters[format], timeZone: SITE.timeZone });
}
