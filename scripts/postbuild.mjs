/**
 * Runs after `vite-react-ssg build`:
 *   1. writes dist/rss.xml and dist/sitemap.xml from the posts' frontmatter,
 *   2. copies dist/404/index.html → dist/404.html (GitHub Pages' 404 page).
 *
 * Reads the post files directly so it stays independent of the Vite build.
 */
import { readdir, readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../src/content/frontmatter.mjs';
import { stripMath } from '../src/content/strip-math.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const POSTS_DIR = path.join(ROOT, 'src/content/blog');

// Keep in sync with SITE in src/consts.ts.
const SITE = {
	title: 'klee9',
	description: 'Transmissions from the void — personal notes, paper reviews, and tech.',
	url: 'https://klee9.github.io',
};
const CATEGORY_LABELS = { personal: 'Personal', 'paper-reviews': 'Paper Reviews', tech: 'Tech' };
const STATIC_PAGES = ['/', '/blog', '/about', ...Object.keys(CATEGORY_LABELS).map((c) => `/blog/category/${c}`)];

const esc = (s) =>
	String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function loadPosts() {
	const files = (await readdir(POSTS_DIR)).filter((f) => /\.mdx?$/.test(f));
	const posts = [];
	for (const file of files) {
		const { data } = parseFrontmatter(await readFile(path.join(POSTS_DIR, file), 'utf8'));
		if (data.draft) continue;
		posts.push({
			id: file.replace(/\.mdx?$/, ''),
			title: stripMath(data.title),
			description: stripMath(data.description),
			pubDate: new Date(data.pubDate),
			updatedDate: data.updatedDate ? new Date(data.updatedDate) : undefined,
			category: data.category,
			tags: Array.isArray(data.tags) ? data.tags : [],
		});
	}
	return posts.sort((a, b) => b.pubDate - a.pubDate || a.id.localeCompare(b.id));
}

function rss(posts) {
	const items = posts
		.map(
			(p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE.url}/blog/${p.id}/</link>
      <guid isPermaLink="true">${SITE.url}/blog/${p.id}/</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${p.pubDate.toUTCString()}</pubDate>
${[CATEGORY_LABELS[p.category] ?? p.category, ...p.tags].map((c) => `      <category>${esc(c)}</category>`).join('\n')}
    </item>`,
		)
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.title)}</title>
    <link>${SITE.url}/</link>
    <description>${esc(SITE.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function sitemap(posts) {
	const urls = [
		...STATIC_PAGES.map((p) => ({ loc: p, lastmod: undefined })),
		...posts.map((p) => ({ loc: `/blog/${p.id}/`, lastmod: (p.updatedDate ?? p.pubDate).toISOString().slice(0, 10) })),
	];
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map((u) => `  <url><loc>${SITE.url}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
	.join('\n')}
</urlset>
`;
}

const posts = await loadPosts();
await mkdir(DIST, { recursive: true });
await writeFile(path.join(DIST, 'rss.xml'), rss(posts));
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(posts));

const notFound = path.join(DIST, '404', 'index.html');
if (existsSync(notFound)) await copyFile(notFound, path.join(DIST, '404.html'));

console.log(`postbuild: rss.xml + sitemap.xml (${posts.length} posts), 404.html`);
