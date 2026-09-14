import { useRef, useState } from 'react';
import { trackOnce } from '../../../lib/analytics';

/**
 * The GR00T N1.5 pre-training data mixture, drawn natively rather than pulled
 * in as NVIDIA's rendered chart, so it themes with the site and scales to the
 * column.
 *
 * The source figure is a donut. This is a 100%% stacked bar instead, for two
 * reasons: three of the five sources hold exactly the same share, which a
 * shared baseline makes obvious and a ring of wedges hides; and length on a
 * common scale is read far more accurately than angle or arc area.
 *
 * Shares are 3:3:3:1:1 elevenths of the mixture — the 27.3%% / 9.1%% figures
 * are those fractions rounded.
 *
 * Usage in an .mdx post:
 *   import DataMix from '../../components/figures/gr00t_n15/DataMix';
 *   <DataMix />
 */

interface Source {
	id: string;
	label: string;
	/** Share of the mixture, in elevenths. */
	parts: number;
	color: string;
}

/** Blue, teal and amber are the same steps the benchmarks figure uses. */
const SOURCES: Source[] = [
	{
		id: 'real-gr1',
		label: 'Real GR-1',
		parts: 3,
		color: '#3b74d6',
	},
	{
		id: 'openxe',
		label: 'OpenXE',
		parts: 3,
		color: '#00a0ad',
	},
	{
		id: 'sim-gr1',
		label: 'Sim GR-1',
		parts: 3,
		color: '#d1770d',
	},
	{
		id: 'dreamgen',
		label: 'DreamGen',
		parts: 1,
		color: '#b54d98',
	},
	{
		id: 'agibot',
		label: 'AgiBot-Beta',
		parts: 1,
		color: '#778b20',
	},
];

const TOTAL = SOURCES.reduce((n, s) => n + s.parts, 0);
const pct = (s: Source) => (s.parts / TOTAL) * 100;

/* ── bar geometry ───────────────────────────────────────────────────────── */

const W = 700;
const BAR_H = 46;
const GAP = 2; // surface gap between segments
const R = 8; // rounded outer ends
const TRACK = W - GAP * (SOURCES.length - 1);

/** A segment, rounded only where it forms an outer end of the bar. */
function segPath(x: number, w: number, first: boolean, last: boolean) {
	const l = first ? Math.min(R, w / 2) : 0;
	const r = last ? Math.min(R, w / 2) : 0;
	return [
		`M${x + l} 0`,
		`H${x + w - r}`,
		r ? `a${r} ${r} 0 0 1 ${r} ${r}` : '',
		`V${BAR_H - r}`,
		r ? `a${r} ${r} 0 0 1 ${-r} ${r}` : '',
		`H${x + l}`,
		l ? `a${l} ${l} 0 0 1 ${-l} ${-l}` : '',
		`V${l}`,
		l ? `a${l} ${l} 0 0 1 ${l} ${-l}` : '',
		'Z',
	].join(' ');
}

export default function DataMix({ wide = false }: { wide?: boolean }) {
	const [selected, setSelected] = useState<string | null>(null);
	const fire = useRef(trackOnce('interact-groot-n15-data-mix', 'GR00T N1.5 data mixture'));

	const pick = (id: string) => {
		fire.current();
		setSelected((cur) => (cur === id ? null : id));
	};

	let cursor = 0;
	const segments = SOURCES.map((s, i) => {
		const w = (s.parts / TOTAL) * TRACK;
		const x = cursor;
		cursor += w + GAP;
		return { s, x, w, first: i === 0, last: i === SOURCES.length - 1 };
	});

	return (
		<figure className={`arch mix${wide ? ' wide' : ''}`}>
			<div className="mix__bar">
				<svg
					viewBox={`0 0 ${W} ${BAR_H}`}
					preserveAspectRatio="none"
					role="img"
					aria-label={`GR00T N1.5 pre-training data mixture: ${SOURCES.map((s) => `${s.label} ${pct(s).toFixed(1)}%`).join(', ')}.`}
				>
					{segments.map(({ s, x, w, first, last }) => (
						<path
							key={s.id}
							d={segPath(x, w, first, last)}
							fill={s.color}
							className={`mix__seg${selected && selected !== s.id ? ' is-dim' : ''}`}
							onClick={() => pick(s.id)}
						>
							<title>{`${s.label}: ${pct(s).toFixed(1)}%`}</title>
						</path>
					))}
				</svg>

				{/* Percentages ride in HTML above the bar so they keep their real type
				    size — the SVG is stretched to the column and would scale them. */}
				<div className="mix__values" aria-hidden="true">
					{segments.map(({ s, w }) => (
						<span
							key={s.id}
							className={`mix__value${selected && selected !== s.id ? ' is-dim' : ''}`}
							style={{ flexBasis: `${(w / W) * 100}%` }}
						>
							{pct(s).toFixed(1)}%
						</span>
					))}
				</div>
			</div>

			<ul className="mix__legend" aria-label="Data sources">
				{SOURCES.map((s) => (
					<li key={s.id}>
						<button
							type="button"
							className={`mix__legend-btn${selected === s.id ? ' is-active' : ''}${
								selected && selected !== s.id ? ' is-dim' : ''
							}`}
							aria-pressed={selected === s.id}
							onClick={() => pick(s.id)}
						>
							<span className="mix__swatch" style={{ background: s.color }} aria-hidden="true" />
							{s.label}
						</button>
					</li>
				))}
			</ul>
		</figure>
	);
}
