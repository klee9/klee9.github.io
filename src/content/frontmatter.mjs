/**
 * Minimal YAML-frontmatter parser for post files.
 *
 * Plain JS (not TS) so both the Vite app (src/content/posts.ts) and the
 * post-build feed script (scripts/postbuild.mjs) can import it without a
 * TypeScript loader. Handles exactly the subset our frontmatter uses:
 *
 *   title: 'Quoted string'        → string
 *   pubDate: 2026-02-15           → string (posts.ts coerces to Date)
 *   draft: false                  → boolean
 *   tags: ['a', "b", c]           → string[]
 *   tags:                         → string[] (block list)
 *     - a
 *     - b
 *
 * Anything fancier (nested objects, multi-line strings) is out of scope;
 * the zod schema in posts.ts will reject what it can't understand.
 */

/**
 * @param {string} source raw file contents
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(source) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
	if (!match) return { data: {}, body: source };

	const data = /** @type {Record<string, unknown>} */ ({});
	const lines = match[1].split(/\r?\n/);
	let listKey = null;

	for (const raw of lines) {
		if (!raw.trim() || raw.trim().startsWith('#')) continue;

		// "  - item" continuation of a block list
		const item = /^\s+-\s*(.*)$/.exec(raw);
		if (item && listKey) {
			/** @type {string[]} */ (data[listKey]).push(scalar(item[1]));
			continue;
		}

		const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
		if (!kv) continue;
		const [, key, value] = kv;
		if (value === '') {
			data[key] = [];
			listKey = key;
		} else {
			data[key] = parseValue(value);
			listKey = null;
		}
	}

	return { data, body: source.slice(match[0].length) };
}

/** @param {string} v */
function parseValue(v) {
	const s = v.trim();
	if (s.startsWith('[') && s.endsWith(']')) {
		const inner = s.slice(1, -1).trim();
		if (!inner) return [];
		return inner.split(',').map((x) => scalar(x));
	}
	return scalar(s);
}

/** @param {string} v */
function scalar(v) {
	const s = v.trim();
	if (/^'.*'$/.test(s) || /^".*"$/.test(s)) return s.slice(1, -1);
	if (s === 'true') return true;
	if (s === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
	return s; // dates and bare strings stay strings
}
