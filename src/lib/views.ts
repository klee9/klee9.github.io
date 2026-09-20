import { useEffect, useState } from 'react';
import { ANALYTICS } from '../consts';

/**
 * View counts, read from GoatCounter's public counter API.
 *
 * The site is static, so there is no server of its own to count anything.
 * GoatCounter is already recording pageviews (see BaseLayout), and it will
 * hand back a page's total at
 *   https://<code>.goatcounter.com/counter/<path>.json
 * once "Allow adding visitor counts on your website" is switched on in its
 * settings. Counts load after hydration; the pre-rendered HTML carries none.
 */

/**
 * One spelling per page. GitHub Pages serves posts as /blog/x/ (a directory),
 * but a client-side navigation reports /blog/x — without this, every post's
 * views would be split across two paths and each counter would show a fraction.
 */
export function canonicalPath(p: string): string {
	return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/** Shared across components and navigations, so each page is fetched once per visit. */
const cache = new Map<string, Promise<number | null>>();

function fetchViews(path: string): Promise<number | null> {
	const code = ANALYTICS.goatcounterCode;
	if (!code) return Promise.resolve(null);

	const key = canonicalPath(path);
	let pending = cache.get(key);
	if (!pending) {
		pending = fetch(`https://${code}.goatcounter.com/counter/${encodeURIComponent(key)}.json`)
			.then(async (res) => {
				// 404 means no views recorded for this path yet, not a failure.
				if (res.status === 404) return 0;
				if (!res.ok) return null;
				const body = (await res.json()) as { count?: string | number };
				// `count` arrives formatted ("1,234"), so strip it back to digits.
				const n = Number(String(body.count ?? '').replace(/[^\d]/g, ''));
				return Number.isFinite(n) ? n : null;
			})
			.catch(() => null);
		cache.set(key, pending);
	}
	return pending;
}

/** A page's total views, or null while loading / if the counter is unavailable. */
export function useViews(path: string): number | null {
	const [views, setViews] = useState<number | null>(null);
	useEffect(() => {
		let live = true;
		fetchViews(path).then((n) => {
			if (live) setViews(n);
		});
		return () => {
			live = false;
		};
	}, [path]);
	return views;
}
