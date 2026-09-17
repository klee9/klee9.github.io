/**
 * Scaffolds a post so the frontmatter is never hand-typed.
 *
 *   npm run post -- "Fine-tuning pi 0.5" --category tech
 *   npm run post -- "Notes on RT-2" -c paper -t VLA,robotics --publish
 *   npm run post -- "생각 정리" -c personal --slug thoughts-on-scale
 *
 * Writes src/content/blog/<slug>.mdx with pubDate stamped in the site's time
 * zone and draft: true, so a half-finished thought can be parked without going
 * live. Pass --publish to start it visible, --md for plain markdown (no JSX).
 */
import { writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { siteMeta, timestamp } from './lib/site-meta.mjs';

const POSTS_DIR = path.resolve(import.meta.dirname, '../src/content/blog');

/** Title → URL slug. Strips accents; anything non-ASCII needs an explicit --slug. */
function slugify(title) {
	return title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
	const out = { positional: [], flags: {} };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const [k, v] = a.slice(2).split('=');
			out.flags[k] = v ?? (argv[i + 1]?.startsWith('-') || argv[i + 1] === undefined ? true : argv[++i]);
		} else if (/^-[a-z]$/.test(a)) {
			out.flags[{ c: 'category', t: 'tags', s: 'slug' }[a[1]] ?? a[1]] = argv[++i];
		} else {
			out.positional.push(a);
		}
	}
	return out;
}

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const { categories, timeZone } = await siteMeta();
	const slugs = Object.keys(categories);

	const title = positional.join(' ').trim();
	if (!title) {
		console.error('Usage: npm run post -- "Post title" --category <' + slugs.join('|') + '> [--tags a,b] [--slug my-slug] [--publish] [--md]');
		process.exit(1);
	}

	const category = flags.category ?? flags.c;
	if (!category || !slugs.includes(category)) {
		console.error(`--category must be one of: ${slugs.join(', ')}` + (category ? `  (got '${category}')` : ''));
		process.exit(1);
	}

	const slug = (flags.slug || slugify(title)).trim();
	if (!slug) {
		console.error(`Could not build a slug from '${title}'. Pass one: --slug my-post`);
		process.exit(1);
	}

	const ext = flags.md ? '.md' : '.mdx';
	const file = path.join(POSTS_DIR, slug + ext);
	for (const e of ['.md', '.mdx']) {
		if (await exists(path.join(POSTS_DIR, slug + e))) {
			console.error(`src/content/blog/${slug}${e} already exists.`);
			process.exit(1);
		}
	}

	const tags = String(flags.tags ?? flags.t ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	const frontmatter = [
		'---',
		`title: '${title.replace(/'/g, "''")}'`,
		"description: ''",
		`pubDate: ${timestamp(timeZone)}`,
		`category: ${category}`,
		`tags: [${tags.map((t) => `'${t}'`).join(', ')}]`,
		`draft: ${flags.publish ? 'false' : 'true'}`,
		'---',
		'',
	].join('\n');

	await writeFile(file, frontmatter);
	console.log(`src/content/blog/${slug}${ext}`);
	console.log(`  → /blog/${slug}${flags.publish ? '' : '   (draft: hidden in the built site, visible in dev)'}`);
}

main().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
