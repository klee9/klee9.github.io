/**
 * Build-time post translation.
 *
 *   ANTHROPIC_API_KEY=... npm run translate -- gr00t-n16
 *   ANTHROPIC_API_KEY=... npm run translate -- --all --force
 *
 * Translates src/content/blog/<slug>.mdx into src/content/blog/<lang>/<slug>.mdx.
 *
 * Why at build time rather than in the browser: the site is static, so an API
 * key shipped to the client would be public, and the text never changes between
 * pageviews anyway. Output is committed, so a translation can be reviewed and
 * corrected like any other file, and the build stays deterministic and offline.
 *
 * Each source file is hashed; unchanged posts are skipped, so the cost is one
 * call per edit rather than one per build.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseFrontmatter } from '../src/content/frontmatter.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src/content/blog');
const CACHE_FILE = path.join(ROOT, '.translations.json');

/** Override with TRANSLATE_MODEL if this id is retired. */
const MODEL = process.env.TRANSLATE_MODEL || 'claude-sonnet-4-5';
const API = 'https://api.anthropic.com/v1/messages';

const LANGS = {
	ko: { name: 'Korean', register: 'the polite formal register (합니다체)' },
};

/**
 * Terms to leave in English. Translating these produces inconsistent coinages
 * and makes the post harder to read for exactly the audience it is aimed at.
 */
const KEEP = [
	'VLA', 'VLM', 'DiT', 'LLM', 'MLP', 'IoU', 'RTC', 'DAgger', 'IDM', 'LAPA', 'FLARE',
	'GR00T', 'N1', 'N1.5', 'N1.6', 'Cosmos', 'Eagle', 'BEHAVIOR', 'RoboCasa', 'DROID',
	'AgiBot', 'Genie1', 'Unitree', 'G1', 'YAM', 'Galaxea', 'DexMimicGen', 'DreamGen',
	'OpenXE', 'Open X-Embodiment', 'Language Table', 'NVIDIA', 'Isaac',
	'pick & place', 'pre-training', 'post-training', 'fine-tuning', 'rollout',
	'end-effector', 'embodiment', 'action chunk', 'locomanipulation',
];

const SYSTEM = (lang) => `You translate technical blog posts from English into ${lang.name}.

The input is an MDX file. Translate ONLY human-readable prose. Everything else must come through byte-identical:

- The YAML frontmatter block: translate the values of \`title\` and \`description\` ONLY if they are ordinary prose. Leave a product name such as 'GR00T N1.6' in English. Do not touch pubDate, category, tags, or draft, and do not add or remove keys.
- \`import\` lines: never change them.
- JSX tags, component names, and attribute NAMES: never change them. The VALUE of a \`note\` attribute IS prose and must be translated.
- Inline and display math ($...$, $$...$$): never change what is between the dollar signs.
- Code fences and inline code: never translate the code.
- Markdown link targets: \`[text](/url)\` — translate the text, keep the url.
- Numbers, percentages, and units: keep exactly as written.
- Heading levels (##, ###) and list markers: keep the same structure, same order, same count.

Leave these terms in English wherever they appear: ${KEEP.join(', ')}.

Write in ${lang.register}. Aim for how a ${lang.name}-speaking robotics researcher would actually write, not a literal word-for-word rendering — but do not add, remove, or soften any claim.

Output the complete translated MDX file and nothing else. No fences around it, no commentary.`;

/* ── structural checks ──────────────────────────────────────────────────── */

const imports = (s) => (s.match(/^import .*$/gm) ?? []).map((l) => l.trim());
const components = (s) => (s.match(/<[A-Z][\w.]*/g) ?? []).sort();
const maths = (s) => (s.match(/\$[^$\n]+\$/g) ?? []);
const fences = (s) => (s.match(/^```/gm) ?? []).length;
const headings = (s) => (s.match(/^#{2,4} /gm) ?? []).length;
const bullets = (s) => (s.match(/^- /gm) ?? []).length;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Throws with a readable reason if the model dropped or mangled structure. */
function verify(src, out) {
	const problems = [];
	if (!same(imports(src), imports(out))) problems.push('import lines differ');
	if (!same(components(src), components(out))) problems.push('JSX component tags differ');
	if (!same(maths(src), maths(out))) problems.push('inline math differs');
	if (fences(src) !== fences(out)) problems.push('code fence count differs');
	if (headings(src) !== headings(out)) problems.push('heading count differs');
	if (bullets(src) !== bullets(out)) problems.push('bullet count differs');

	const a = parseFrontmatter(src).data;
	const b = parseFrontmatter(out).data;
	if (!same(Object.keys(a).sort(), Object.keys(b).sort())) problems.push('frontmatter keys differ');
	for (const k of ['pubDate', 'category', 'draft']) {
		if (String(a[k] ?? '') !== String(b[k] ?? '')) problems.push(`frontmatter ${k} changed`);
	}
	if (!same(a.tags, b.tags)) problems.push('frontmatter tags changed');
	if (problems.length) throw new Error('translation failed structure check:\n  - ' + problems.join('\n  - '));
}

/** A post one directory deeper needs one more level on every relative import. */
const fixImportDepth = (s) => s.replace(/(from ')(\.\.\/)+/g, (m, head, ups) => head + ups + '../');

/* ── translation ────────────────────────────────────────────────────────── */

async function translate(source, lang) {
	const key = process.env.ANTHROPIC_API_KEY;
	if (!key) throw new Error('ANTHROPIC_API_KEY is not set');

	const res = await fetch(API, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': key,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 8192,
			system: SYSTEM(lang),
			messages: [{ role: 'user', content: source }],
		}),
	});
	if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
	const body = await res.json();
	const text = body.content?.map((b) => b.text ?? '').join('') ?? '';
	if (!text.trim()) throw new Error('empty response from the API');
	return text.trim() + '\n';
}

/* ── driver ─────────────────────────────────────────────────────────────── */

async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force');
	const all = args.includes('--all');
	const langArg = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'ko';
	const lang = LANGS[langArg];
	if (!lang) throw new Error(`unknown language '${langArg}' (have: ${Object.keys(LANGS).join(', ')})`);

	const slugs = all
		? (await readdir(POSTS_DIR)).filter((f) => /\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''))
		: args.filter((a) => !a.startsWith('--'));
	if (!slugs.length) throw new Error('name a post slug, or pass --all');

	const cache = existsSync(CACHE_FILE) ? JSON.parse(await readFile(CACHE_FILE, 'utf8')) : {};
	const outDir = path.join(POSTS_DIR, langArg);
	await mkdir(outDir, { recursive: true });

	for (const slug of slugs) {
		const ext = existsSync(path.join(POSTS_DIR, `${slug}.mdx`)) ? '.mdx' : '.md';
		const src = await readFile(path.join(POSTS_DIR, slug + ext), 'utf8');
		const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
		const cacheKey = `${langArg}/${slug}`;
		const outPath = path.join(outDir, slug + ext);

		if (!force && cache[cacheKey] === hash && existsSync(outPath)) {
			console.log(`· ${cacheKey} unchanged`);
			continue;
		}

		process.stdout.write(`→ ${cacheKey} … `);
		const out = fixImportDepth(await translate(src, lang));
		verify(src, out);
		await writeFile(outPath, out);
		cache[cacheKey] = hash;
		console.log('ok');
	}

	await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
}

main().catch((e) => {
	console.error('\n' + e.message);
	process.exit(1);
});
