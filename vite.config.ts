import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const POSTS_DIR = fileURLToPath(new URL('./src/content/blog', import.meta.url));

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
				rehypePlugins: [rehypeKatex], // → KaTeX HTML at build time
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
