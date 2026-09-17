/**
 * Reads the few values the build scripts need out of src/consts.ts.
 *
 * The scripts run outside Vite and cannot import TypeScript, but duplicating
 * the category list is how it silently drifts — the sitemap spent a while
 * emitting /blog/category/paper-reviews, a URL that has never existed. Parsing
 * the one source of truth is uglier than an import and much harder to get
 * quietly wrong: if the shape changes, this throws instead of guessing.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CONSTS = path.resolve(import.meta.dirname, '../../src/consts.ts');

/** @returns {Promise<{categories: Record<string,string>, timeZone: string}>} */
export async function siteMeta() {
	const src = await readFile(CONSTS, 'utf8');

	const block = /export const CATEGORIES = \{([\s\S]*?)\n\} as const;/.exec(src);
	if (!block) throw new Error(`could not find CATEGORIES in ${CONSTS}`);

	const categories = {};
	for (const m of block[1].matchAll(/(\w+):\s*\{[^}]*?label:\s*'([^']+)'/g)) {
		categories[m[1]] = m[2];
	}
	if (!Object.keys(categories).length) throw new Error('parsed CATEGORIES but found no entries');

	const tz = /timeZone:\s*'([^']+)'/.exec(src);
	return { categories, timeZone: tz ? tz[1] : 'UTC' };
}

/** Current local time in `tz` as an ISO string with a real offset, e.g. 2026-09-17T14:05:00+09:00. */
export function timestamp(tz, now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(now);
	const at = (t) => parts.find((p) => p.type === t).value;

	const zone = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'longOffset' })
		.formatToParts(now)
		.find((p) => p.type === 'timeZoneName').value;
	const offset = zone.replace('GMT', '') || '+00:00';

	return `${at('year')}-${at('month')}-${at('day')}T${at('hour')}:${at('minute')}:${at('second')}${offset}`;
}
