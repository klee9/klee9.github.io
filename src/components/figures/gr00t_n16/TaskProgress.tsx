/**
 * GR00T N1.5 vs N1.6 average task progress across the four real-robot
 * evaluation suites, drawn natively rather than embedded as NVIDIA's Chart.js
 * canvas — so it themes with the site, scales to the column, and is readable
 * without JavaScript.
 *
 * Same encoding as the source chart (two series, grouped by suite), turned on
 * its side: fifteen tasks across a reading column would otherwise need the
 * 45-degree rotated labels the original resorts to.
 *
 * Figures are percentages, as published on the GR00T N1.6 research page.
 *
 * Usage in an .mdx post:
 *   import TaskProgress from '../../components/figures/gr00t_n16/TaskProgress';
 *   <TaskProgress />
 */

interface Task {
	name: string;
	n15: number;
	n16: number;
}

interface Group {
	name: string;
	tasks: Task[];
}

const GROUPS: Group[] = [
	{
		name: 'Bimanual YAM — atomic skills & household',
		tasks: [
			{ name: 'Cube pick & place', n15: 33.8, n16: 98.8 },
			{ name: 'Bar pick & place', n15: 21.3, n16: 92.3 },
			{ name: 'Cube handover', n15: 59.5, n16: 88 },
			{ name: 'Fruit pick & place', n15: 100, n16: 95 },
			{ name: 'Fold towel', n15: 67, n16: 93 },
			{ name: 'Fold t-shirt', n15: 16.5, n16: 80 },
		],
	},
	{
		name: 'AgiBot household',
		tasks: [
			{ name: 'Fold t-shirt', n15: 69, n16: 73 },
			{ name: 'Bus table', n15: 66, n16: 68 },
			{ name: 'Fruit packing', n15: 73, n16: 73 },
		],
	},
	{
		name: 'Bimanual YAM industrial',
		tasks: [
			{ name: 'Connect tube', n15: 18.3, n16: 59.8 },
			{ name: 'Rail into GPU', n15: 81, n16: 88 },
		],
	},
	{
		name: 'Unitree G1 locomanipulation',
		tasks: [
			{ name: 'Walk & pick bottle', n15: 86.6, n16: 98.3 },
			{ name: 'Fruit to plate', n15: 93.8, n16: 96.4 },
			{ name: 'Shelf pick & place', n15: 67, n16: 79.2 },
			{ name: 'Multi-station pick & place', n15: 60, n16: 67 },
		],
	},
];

/** N1.5 is the reference, so it stays neutral; N1.6 carries the one hue. */
const SERIES = [
	{ key: 'n15' as const, label: 'GR00T N1.5', color: '#83868e' },
	{ key: 'n16' as const, label: 'GR00T N1.6', color: '#3b74d6' },
];

/* ── plot geometry ──────────────────────────────────────────────────────── */

const W = 700;
const LABEL_W = 190;
const X0 = LABEL_W;
const TRACK = 420;
const BAR_H = 9;
const BAR_GAP = 3;
const ROW = 28;
const GROUP_H = 26;
const TOP = 22;
const AXIS_H = 26;
const TICKS = [0, 25, 50, 75, 100];

const ROWS = GROUPS.reduce((n, g) => n + g.tasks.length, 0);
const PLOT_H = GROUPS.length * GROUP_H + ROWS * ROW;
const H = TOP + PLOT_H + AXIS_H;

const scaleX = (v: number) => (v / 100) * TRACK;

export default function TaskProgress({ wide = false }: { wide?: boolean }) {
	// Lay the rows out once so the grid and the bars agree.
	let y = TOP;
	const groups = GROUPS.map((g) => {
		const headerY = y;
		y += GROUP_H;
		const rows = g.tasks.map((t) => {
			const rowY = y;
			y += ROW;
			return { t, y: rowY };
		});
		return { g, headerY, rows };
	});

	const summary = GROUPS.flatMap((g) =>
		g.tasks.map((t) => `${g.name}, ${t.name}: N1.5 ${t.n15}%, N1.6 ${t.n16}%`),
	).join('. ');

	return (
		<figure className={`arch tp${wide ? ' wide' : ''}`}>
			<ul className="tp__legend" aria-label="Models">
				{SERIES.map((s) => (
					<li key={s.key}>
						<span className="tp__swatch" style={{ background: s.color }} aria-hidden="true" />
						{s.label}
					</li>
				))}
			</ul>

			<div className="arch__scroll">
				<svg
					className="tp__svg"
					viewBox={`0 0 ${W} ${H}`}
					role="img"
					aria-label={`Average task progress, GR00T N1.5 versus N1.6. ${summary}.`}
				>
					{/* recessive grid, drawn behind everything */}
					{TICKS.map((t) => (
						<g key={t}>
							<path
								d={`M${X0 + scaleX(t)} ${TOP - 8} V${TOP + PLOT_H}`}
								className={`tp__grid${t === 0 ? ' tp__grid--base' : ''}`}
							/>
							<text x={X0 + scaleX(t)} y={TOP + PLOT_H + 16} className="tp__tick">
								{t}
							</text>
						</g>
					))}
					<text x={X0 + TRACK / 2} y={H - 2} className="tp__axis-title">
						Average task progress (%)
					</text>

					{groups.map(({ g, headerY, rows }) => (
						<g key={g.name}>
							<text x={0} y={headerY + 14} className="tp__group">
								{g.name}
							</text>
							{rows.map(({ t, y: rowY }) => (
								<g key={t.name}>
									<text x={LABEL_W - 12} y={rowY + BAR_H + BAR_GAP + 2} className="tp__name">
										{t.name}
									</text>
									{SERIES.map((s, i) => {
										const v = t[s.key];
										const by = rowY + i * (BAR_H + BAR_GAP);
										return (
											<g key={s.key}>
												<rect
													x={X0}
													y={by}
													width={Math.max(scaleX(v), 1)}
													height={BAR_H}
													rx={3}
													fill={s.color}
												>
													<title>{`${s.label} — ${t.name}: ${v}%`}</title>
												</rect>
												<text x={X0 + scaleX(v) + 6} y={by + BAR_H - 1} className="tp__value">
													{v}
												</text>
											</g>
										);
									})}
								</g>
							))}
						</g>
					))}
				</svg>
			</div>

			<figcaption className="arch__caption">
				Average task progress on fifteen real-robot tasks
			</figcaption>
		</figure>
	);
}
