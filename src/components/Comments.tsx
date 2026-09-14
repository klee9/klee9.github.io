import { useEffect, useRef } from 'react';
import { COMMENTS } from '../consts';

const enabled = Boolean(COMMENTS.repoId && COMMENTS.categoryId);

const themeFor = (t: string | undefined) => (t === 'light' ? 'light' : 'dark');
const currentTheme = () => document.documentElement.dataset.theme;

/**
 * giscus comments (GitHub Discussions). Renders nothing until COMMENTS.repoId
 * and categoryId are filled in (see src/consts.ts). Follows the site's
 * light/dark switch by watching <html data-theme> and messaging the iframe.
 *
 * `term` is what the discussion is keyed on — pass the post slug so a post
 * keeps its thread even if the URL structure changes.
 */
export default function Comments({ term }: { term: string }) {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!enabled || !host.current) return;
		const container = host.current;
		container.innerHTML = '';

		const s = document.createElement('script');
		s.src = 'https://giscus.app/client.js';
		s.async = true;
		s.crossOrigin = 'anonymous';
		const attrs: Record<string, string> = {
			'data-repo': COMMENTS.repo,
			'data-repo-id': COMMENTS.repoId,
			'data-category': COMMENTS.category,
			'data-category-id': COMMENTS.categoryId,
			'data-mapping': 'specific',
			'data-term': term,
			'data-strict': '1',
			'data-reactions-enabled': '1',
			'data-emit-metadata': '0',
			'data-input-position': 'top',
			'data-theme': themeFor(currentTheme()),
			'data-lang': 'en',
			'data-loading': 'lazy',
		};
		for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
		container.appendChild(s);

		const observer = new MutationObserver(() => {
			const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
			iframe?.contentWindow?.postMessage(
				{ giscus: { setConfig: { theme: themeFor(currentTheme()) } } },
				'https://giscus.app',
			);
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		return () => {
			observer.disconnect();
			container.innerHTML = '';
		};
	}, [term]);

	if (!enabled) return null;

	return (
		<section className="comments container container--post" aria-label="Comments">
			<h2 className="comments__title">Comments</h2>
			<div ref={host} />
		</section>
	);
}
