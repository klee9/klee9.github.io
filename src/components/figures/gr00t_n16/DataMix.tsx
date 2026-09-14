/**
 * The GR00T N1.6 pre-training data mixture, drawn natively instead of pulled in
 * as NVIDIA's rendered chart, so it themes with the site and scales to the
 * column.
 *
 * The source figure is a 3D donut of nine slices. This is a sorted bar chart
 * instead: nine wedges is past the point where a ring can be read, the tilt
 * distorts the near slices against the far ones, and four of the nine shares
 * are tied — ties that a common baseline shows and a ring hides.
 *
 * Shares are ninety-firsts of the mixture; the percentages NVIDIA prints are
 * those fractions rounded (20/91 = 22.0%, 10/91 = 11.0%, and so on).
 *
 * Usage in an .mdx post:
 *   import DataMix from '../../components/figures/gr00t_n16/DataMix';
 *   <DataMix />
 */

interface Source {
	label: string;
	/** Share of the mixture, in ninety-firsts. */
	parts: number;
	color: string;
}

/**
 * One hue per source, stepped around the wheel so that vertical neighbours land
 * far apart. Every step sits inside the lightness band both themes share, so a
 * single palette serves light and dark; adjacent pairs clear the colour-vision
 * separation floor, and each bar is named and valued in text besides, so colour
 * never carries identity alone.
 *
 * Sorted by share, largest first.
 */
const SOURCES: Source[] = [
	{ label: 'BEHAVIOR (Sim)', parts: 20, color: '#e25277' },
	{ label: 'Real Bimanual YAM', parts: 20, color: '#009eaf' },
	{ label: 'Real AgiBot', parts: 20, color: '#dd6300' },
	{ label: 'Simulated GR-1', parts: 10, color: '#0091ef' },
	{ label: 'Real GR-1', parts: 5, color: '#ad8600' },
	{ label: 'Real Unitree G1', parts: 5, color: '#8a75f1' },
	{ label: 'RoboCasa (Sim)', parts: 5, color: '#6e9e00' },
	{ label: 'DROID', parts: 3, color: '#c45dc2' },
	{ label: 'Language Table', parts: 3, color: '#00a57d' },
];

const TOTAL = SOURCES.reduce((n, s) => n + s.parts, 0);
const pct = (s: Source) => (s.parts / TOTAL) * 100;

/* ── plot geometry ──────────────────────────────────────────────────────── */

const W = 700;
const ROW = 26;
const BAR_H = 14;
const LABEL_W = 152; // widest label is "Real Bimanual YAM"
const TRACK = 470; // bar track, leaving room for the value at the end
const TOP = 4;
const H = TOP + SOURCES.length * ROW + 4;

const MAX = Math.max(...SOURCES.map((s) => s.parts));

export default function DataMix({ wide = false }: { wide?: boolean }) {
	return (
		<figure className={`arch mix16${wide ? ' wide' : ''}`}>
			<div className="arch__scroll">
				<svg
					className="mix16__svg"
					viewBox={`0 0 ${W} ${H}`}
					role="img"
					aria-label={`GR00T N1.6 pre-training data mixture: ${SOURCES.map((s) => `${s.label} ${pct(s).toFixed(1)}%`).join(', ')}.`}
				>
					{SOURCES.map((s, i) => {
						const y = TOP + i * ROW;
						const w = (s.parts / MAX) * TRACK;
						return (
							<g key={s.label}>
								<text x={LABEL_W - 10} y={y + BAR_H - 2} className="mix16__name">
									{s.label}
								</text>
								<rect x={LABEL_W} y={y} width={w} height={BAR_H} rx={4} fill={s.color}>
									<title>{`${s.label}: ${pct(s).toFixed(1)}%`}</title>
								</rect>
								<text x={LABEL_W + w + 8} y={y + BAR_H - 2} className="mix16__value">
									{pct(s).toFixed(1)}%
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			<figcaption className="arch__caption">
				The GR00T N1.6 pre-training mixture
			</figcaption>
		</figure>
	);
}
