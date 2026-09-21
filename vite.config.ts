import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';

const POSTS_DIR = fileURLToPath(new URL('./src/content/blog', import.meta.url));

/**
 * Wraps every post table in a horizontally scrollable container.
 *
 * A table cannot shrink below the widest word in its cells, so on a phone a
 * data table pushes past the column and takes the whole page into horizontal
 * scroll with it. Giving it its own scroll box confines that to the table.
 *
 * A rehype plugin rather than CSS, because `display: block` on a <table> — the
 * usual CSS-only workaround — throws away real table layout and with it the
 * column sizing. Hand-written so it costs no dependency.
 */
/** A cell longer than this (in characters) marks the table as prose. */
const WRAP_THRESHOLD = 40;

const textOf = (node: any): string =>
	node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

function longestCell(table: any): number {
	let max = 0;
	const visit = (node: any) => {
		if (node.type === 'element' && (node.tagName === 'td' || node.tagName === 'th')) {
			max = Math.max(max, textOf(node).trim().length);
			return;
		}
		(node.children ?? []).forEach(visit);
	};
	visit(table);
	return max;
}

function rehypeScrollableTables() {
	/** @param {any} node */
	return (tree: any) => {
		const walk = (node: any) => {
			if (!node?.children) return;
			node.children = node.children.map((child: any) => {
				walk(child);
				if (child.type !== 'element' || child.tagName !== 'table') return child;
				// Tables of sentences wrap; tables of numbers and short labels scroll.
				const prose = longestCell(child) > WRAP_THRESHOLD;
				return {
					type: 'element',
					tagName: 'div',
					properties: {
						className: prose ? ['table-scroll', 'table-scroll--wrap'] : ['table-scroll'],
						// A scrollable region needs to be reachable without a mouse.
						tabIndex: 0,
						role: 'region',
						'aria-label': 'Table',
					},
					children: [child],
				};
			});
		};
		walk(tree);
	};
}

/**
 * Appends each post's original text to its own compiled module as
 * `export const rawSource`, so src/content/posts.ts can read the frontmatter
 * and count words.
 *
 * It has to be a separate export rather than a `?raw` import: the MDX plugin
 * strips the query from module ids and would compile the raw text. Carrying the
 * text inside the post's own module (instead of a separate virtual module of
 * all posts) means the two can never go out of sync when a post is added,
 * renamed, or deleted while the dev server is running.
 *
 * `enforce: 'post'` so this runs after MDX has turned the file into JS; the file
 * is re-read from disk because `code` at that point is the compiled output.
 */
function postRawSource(): Plugin {
	return {
		name: 'post-raw-source',
		enforce: 'post',
		transform(code, id) {
			const file = id.split('?')[0];
			if (!file.startsWith(POSTS_DIR) || !/\.mdx?$/.test(file)) return;
			const raw = readFileSync(file, 'utf8');
			return { code: `${code}\nexport const rawSource = ${JSON.stringify(raw)};\n`, map: null };
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		// MDX must run before the React plugin so the JSX it emits gets transformed.
		{
			enforce: 'pre',
			...mdx({
				// Posts are .mdx (components allowed) or .md (plain markdown, no JSX).
				remarkPlugins: [
					remarkFrontmatter, // strip the --- YAML block; posts.ts parses it separately
					remarkGfm, // tables, strikethrough, task lists, autolinks — not in core CommonMark
					remarkMath, // $...$ and $$...$$
				],
				rehypePlugins: [
					[
						rehypeShiki,
						{
							// Both themes are emitted as CSS custom properties on every token,
							// so the theme switch is a CSS swap rather than a re-highlight.
							themes: { light: 'github-light', dark: 'github-dark-dimmed' },
							defaultColor: false,
						},
					],
					rehypeKatex, // → KaTeX HTML at build time
					rehypeScrollableTables,
				],
			}),
		},
		react({ include: /\.(mdx?|[jt]sx?)$/ }),
		postRawSource(),
	],
	// vite-react-ssg: pre-render every route to static HTML at build time.
	ssgOptions: {
		script: 'async',
		formatting: 'none',
		dirStyle: 'nested', // /blog/my-post/index.html → clean URLs on GitHub Pages
	},
});
