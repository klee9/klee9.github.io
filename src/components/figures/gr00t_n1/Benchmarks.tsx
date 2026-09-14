import { useRef, useState } from 'react';
import { trackOnce } from '../../../lib/analytics';

/**
 * GR00T N1 benchmark results as two grouped bar charts — RoboCasa in simulation
 * and the real GR-1 humanoid — drawn as live SVG rather than a screenshot, so
 * they theme, scale, and can be read by a screen reader.
 *
 * Both panels share one y-axis (success rate, 0–60%) and one legend. Selecting
 * a model dims the others in both panels at once, which is the comparison the
 * figure exists to support.
 *
 * Palette: a deliberately neutral gray for the Diffusion Policy baseline, then
 * blue / teal / amber for the GR00T variants. Validated for CVD separation and
 * contrast against both the light and dark chart surface; the gray fails a
 * chroma floor on purpose — it is the reference series and should stay
 * recessive, and it is separated from every neighbour by ΔE ≥ 14.
 *
 * Usage in an .mdx post:
 *   import Benchmarks from '../../components/figures/Benchmarks';
 *   <Benchmarks />
 */

/* ── data ───────────────────────────────────────────────────────────────── */

interface Series {
	id: string;
	label: string;
	color: string;
}

const SERIES: Series[] = [
	{ id: 'dp', label: 'Diffusion Policy', color: '#83868e' },
	{ id: 'n1', label: 'GR00T-N1-2B', color: '#3b74d6' },
	{ id: 'lapa', label: 'GR00T-N1-2B + LAPA', color: '#00a0ad' },
	{ id: 'idm', label: 'GR00T-N1-2B + IDM', color: '#d1770d' },
];

interface Panel {
	id: string;
	title: string;
	/** Category labels along the x-axis. */
	groups: string[];
	axisLabel: string;
	/** Series id → one value per group. Order follows SERIES. */
	values: Record<string, number[]>;
}

const PANELS: Panel[] = [
	{
		id: 'robocasa',
		title: 'RoboCasa',
		groups: ['30', '100', '300'],
		axisLabel: 'Demos per task (24 tasks)',
		values: {
			dp: [14.7, 25.6, 43.2],
			n1: [17.4, 32.1, 49.6],
			lapa: [21.6, 39.5, 52.9],
			idm: [21.2, 40.9, 56.4],
		},
	},
	{
		id: 'gr1',
		title: 'Real GR-1 humanoid',
		groups: ['Pick & place\n(5 tasks)', 'Industrial\n(3 tasks)', 'Overall\n(8 tasks)'],
		axisLabel: 'Task group',
		values: {
			dp: [2.0, 6.67, 4.07],
			n1: [36.0, 31.0, 33.78],
			idm: [42.0, 36.67, 39.63],
		},
	},
];

/* ── plot geometry ──────────────────────────────────────────────────────── */

const W = 430;
const H = 252;
const X0 = 44;
const X1 = 420;
const Y0 = 18;
const Y1 = 202;
const Y_MAX = 60;
const TICKS = [0, 15, 30, 45, 60];
const GAP = 2; // surface gap between adjacent bars
const RADIUS = 4; // rounded data-end, anchored to the baseline

const scaleY = (v: number) => Y1 - (v / Y_MAX) * (Y1 - Y0);

/** A bar with rounded top corners and a square foot on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
	const r = Math.min(RADIUS, w / 2, h);
	return `M${x} ${Y1} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${Y1} Z`;
}

function Chart({ panel, selected }: { panel: Panel; selected: string | null }) {
	const shown = SERIES.filter((s) => panel.values[s.id]);
	const groupWidth = (X1 - X0) / panel.groups.length;
	const inner = groupWidth * 0.72;
	const barWidth = (inner - GAP * (shown.length - 1)) / shown.length;

	const summary = shown
		.map((s) => `${s.label}: ${panel.values[s.id].map((v, i) => `${panel.groups[i].replace(/\n/g, ' ')} ${v}%`).join(', ')}`)
		.join('. ');

	return (
		<svg
			className="bch__svg"
			viewBox={`0 0 ${W} ${H}`}
			role="img"
			aria-label={`${panel.title}: success rate by ${panel.axisLabel.toLowerCase()}. ${summary}.`}
		>
			{/* recessive grid and value axis */}
			{TICKS.map((t) => (
				<g key={t}>
					<path d={`M${X0} ${scaleY(t)} H${X1}`} className={`bch__grid${t === 0 ? ' bch__grid--base' : ''}`} />
					<text x={X0 - 9} y={scaleY(t) + 4} className="bch__tick">
						{t}
					</text>
				</g>
			))}
			<text
				className="bch__axis-title"
				transform={`translate(13 ${(Y0 + Y1) / 2}) rotate(-90)`}
			>
				Success rate (%)
			</text>

			{panel.groups.map((group, g) => {
				const left = X0 + groupWidth * g + (groupWidth - inner) / 2;
				return (
					<g key={group}>
						{shown.map((s, j) => {
							const v = panel.values[s.id][g];
							const x = left + j * (barWidth + GAP);
							const y = scaleY(v);
							const dim = selected !== null && selected !== s.id;
							return (
								<g key={s.id} className={`bch__bar${dim ? ' is-dim' : ''}`}>
									<path d={barPath(x, y, barWidth, Y1 - y)} fill={s.color}>
										<title>{`${s.label} — ${group.replace(/\n/g, ' ')}: ${v}%`}</title>
									</path>
									<text x={x + barWidth / 2} y={y - 5} className="bch__value">
										{v}
									</text>
								</g>
							);
						})}
						{group.split('\n').map((line, i) => (
							<text key={line} x={X0 + groupWidth * (g + 0.5)} y={Y1 + 18 + i * 12} className="bch__cat">
								{line}
							</text>
						))}
					</g>
				);
			})}

			<text x={(X0 + X1) / 2} y={H - 6} className="bch__axis-title">
				{panel.axisLabel}
			</text>
		</svg>
	);
}

/* Sits in the reading column, the same width as the body text; pass wide to let
   it escape to the wide track. */
export default function Benchmarks({ wide = false }: { wide?: boolean }) {
	const [selected, setSelected] = useState<string | null>(null);
	const fire = useRef(trackOnce('interact-groot-benchmarks', 'GR00T N1 benchmarks'));

	const pick = (id: string) => {
		fire.current();
		setSelected((cur) => (cur === id ? null : id));
	};

	return (
		<figure className={`arch bch${wide ? ' wide' : ''}`}>
			{/* One legend for both panels: identity is never carried by color alone,
			    and selecting a model dims it out of both charts at once. */}
			<ul className="bch__legend" aria-label="Models">
				{SERIES.map((s) => (
					<li key={s.id}>
						<button
							type="button"
							className={`bch__legend-btn${selected === s.id ? ' is-active' : ''}${
								selected !== null && selected !== s.id ? ' is-dim' : ''
							}`}
							aria-pressed={selected === s.id}
							onClick={() => pick(s.id)}
						>
							<span className="bch__swatch" style={{ background: s.color }} aria-hidden="true" />
							{s.label}
						</button>
					</li>
				))}
			</ul>

			<div className="bch__panels">
				{PANELS.map((p) => (
					<div key={p.id} className="bch__panel">
						<h4 className="bch__title">{p.title}</h4>
						<Chart panel={p} selected={selected} />
					</div>
				))}
			</div>
		</figure>
	);
}
