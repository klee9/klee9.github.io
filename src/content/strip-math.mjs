/**
 * A plain-text rendering of a string that may contain inline `$...$` math, for
 * places that cannot hold markup: the document <title>, meta and Open Graph
 * tags, and the RSS feed.
 *
 * Best-effort by design — it maps the common macros to their Unicode
 * equivalents and unwraps the rest, so `Fine-Tuning $\pi_{0.5}$` reads as
 * `Fine-Tuning π₀.₅` rather than as raw TeX.
 *
 * Plain .mjs so the post-build script (which never runs through Vite) and the
 * React components can share one implementation.
 */

/** Digits and a few symbols have Unicode subscripts; most characters do not. */
const SUBSCRIPT = {
	'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
	'5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
	'+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
};

const MACROS = {
	alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
	epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
	pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ',
	omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
	times: '×', cdot: '·', pm: '±', leq: '≤', geq: '≥',
	le: '≤', ge: '≥', neq: '≠', to: '→', infty: '∞',
	approx: '≈', ldots: '…', dots: '…',
};

export function stripMath(text) {
	return String(text).replace(/\$([^$]+)\$/g, (_, tex) => {
		let out = tex;
		// \pi, \times, … → the character they stand for
		out = out.replace(/\\([A-Za-z]+)/g, (_m, name) => MACROS[name] ?? name);
		// _{0.5} and _t → subscripts, where the characters have them
		out = out.replace(/_\{?([^{}\s]+)\}?/g, (_m, sub) =>
			[...sub].map((ch) => SUBSCRIPT[ch] ?? ch).join(''),
		);
		// ^{2} and ^n have no general Unicode equivalent; keep the caret
		return out.replace(/[{}]/g, '').trim();
	});
}
