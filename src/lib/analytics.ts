import { canonicalPath } from './views';

/**
 * Thin wrapper over the analytics scripts so components can report
 * interactions without knowing which service is loaded.
 *
 * BaseLayout emits the Google Analytics and/or GoatCounter scripts in
 * production builds according to ANALYTICS in src/consts.ts. Here we just call
 * whichever globals exist; in dev neither is defined and every call is a no-op.
 *
 * - GA4: sent as a custom event `interact` with `{ name, title }` params.
 * - GoatCounter: sent as a pageview with `event: true`, which the dashboard
 *   lists alongside page paths.
 */

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		goatcounter?: {
			count: (opts: { path: string; title?: string; event?: boolean }) => void;
		};
	}
}

/** Record a named interaction, e.g. `track('interact-softmax', 'Softmax slider')`. */
export function track(name: string, title?: string): void {
	if (typeof window === 'undefined') return;
	try {
		window.gtag?.('event', 'interact', { name, title: title ?? name });
	} catch {
		/* analytics must never break the page */
	}
	try {
		window.goatcounter?.count({ path: name, title, event: true });
	} catch {
		/* ditto */
	}
}

/**
 * Report a client-side navigation as a pageview. The analytics scripts count
 * the initial page load themselves; React Router navigations don't reload the
 * page, so BaseLayout calls this whenever the pathname changes.
 */
export function pageview(rawPath: string): void {
	if (typeof window === 'undefined') return;
	const path = canonicalPath(rawPath);
	try {
		window.gtag?.('event', 'page_view', { page_path: path, page_title: document.title });
	} catch {
		/* ignore */
	}
	try {
		window.goatcounter?.count({ path, title: document.title });
	} catch {
		/* ignore */
	}
}

/**
 * Returns a function that fires `track` only the first time it is called.
 * Use it inside components so a slider drag registers one interaction, not
 * one per pixel.
 */
export function trackOnce(name: string, title?: string): () => void {
	let fired = false;
	return () => {
		if (fired) return;
		fired = true;
		track(name, title);
	};
}
