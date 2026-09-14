export const SITE = {
	title: 'klee9',
	tagline: '',
	description: 'Personal notes, paper reviews, and tech.',
	url: 'https://klee9.github.io',
	author: 'Keon Lee',
	github: 'https://github.com/klee9',
} as const;

/**
 * Analytics. Either service can be enabled independently; leave a field empty
 * to disable it. Scripts are only emitted in production builds, so local dev
 * never counts, and `track()` in src/lib/analytics.ts reports interaction
 * events to whichever services are enabled.
 *
 * - Google Analytics 4 (free): create a property at https://analytics.google.com,
 *   add a Web data stream, and paste its Measurement ID (looks like G-XXXXXXXXXX).
 *   GA sets cookies, so EU visitors technically require a consent banner.
 * - GoatCounter (free, cookie-free, no banner): https://www.goatcounter.com.
 */
export const ANALYTICS = {
	gaMeasurementId: '', // e.g. 'G-X3KVSNJ43V'
	goatcounterCode: 'klee9', // → https://klee9.goatcounter.com
} as const;

/**
 * Comments via giscus (GitHub Discussions). Setup, once:
 *   1. Enable Discussions on the repo (Settings → General → Features).
 *   2. Install the giscus app: https://github.com/apps/giscus
 *   3. Open https://giscus.app, enter the repo, choose the "Announcements"
 *      category, and copy the repoId / categoryId it generates into here.
 * Leave `repoId` empty to hide the comments section.
 */
export const COMMENTS = {
	repo: 'klee9/klee9.github.io',
	repoId: '',
	category: 'Announcements',
	categoryId: '',
} as const;

export const CATEGORIES = {
	personal: {
		label: 'Personal',
		description: 'Logs from the journey.',
		color: 'var(--color-category-personal)',
	},
	paper: {
		label: 'Paper Review',
		description: 'Signals decoded from research.',
		color: 'var(--color-category-papers)',
	},
	tech: {
		label: 'Tech',
		description: 'Systems, tools, and experiments.',
		color: 'var(--color-category-tech)',
	},
} as const;

export type Category = keyof typeof CATEGORIES;

export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as Category[];

export function isCategory(value: string | undefined): value is Category {
	return value !== undefined && value in CATEGORIES;
}
