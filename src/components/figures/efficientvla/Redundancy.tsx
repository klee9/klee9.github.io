import { useRef, useState } from 'react';
import { trackOnce } from '../../../lib/analytics';
import { LAYERS, STEPS } from './redundancyData';

/**
 * The three redundancies EfficientVLA exploits, redrawn as live SVG:
 *   (a) visual tokens — past ~112 tokens inference turns compute-bound,
 *   (b) layers — deep LLM layers produce near-identical outputs,
 *   (c) timesteps — attention / MLP outputs barely change between denoising steps.
 *
 * The paper plots FLOPs and latency on one chart with two y-axes. Here they are
 * two small charts sharing one x-axis instead. The heatmaps keep the paper's
 * YlGnBu colour scale and layout.
 *
 * Values in (a) are read off the paper's figure. The heatmap cells in (b) and
 * (c) are measured from the figure's colours (see redundancyData.ts).
 *
 * Usage in an .mdx post:
 *   import Redundancy from '../../components/figures/efficientvla/Redundancy';
 *   <Redundancy />
 */

/* ── colours (matching the paper) ───────────────────────────────────────── */

/** matplotlib's YlGnBu, sampled at nine even stops. */
const YLGNBU = ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58'];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function ylgnbu(t: number) {
	const x = Math.max(0, Math.min(1, t)) * (YLGNBU.length - 1);
	const i = Math.min(YLGNBU.length - 2, Math.floor(x));
	const f = x - i;
	const a = hex(YLGNBU[i]);
	const b = hex(YLGNBU[i + 1]);
	return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

/* ── (a) token-wise bottleneck ──────────────────────────────────────────── */

const TOKENS = [16, 56, 72, 96, 112, 136, 176, 216, 256];
const FLOPS = [1.27, 1.76, 1.97, 2.25, 2.45, 2.75, 3.25, 3.74, 4.19];
const TIME = [0.186, 0.187, 0.1875, 0.189, 0.193, 0.199, 0.21, 0.218, 0.234];
/** Where the paper draws the memory-bound / computation-bound boundary. */
const KNEE = 112;

const A = { x0: 40, x1: 290, top: [22, 118] as const, bot: [168, 264] as const };
const ax = (t: number) => A.x0 + ((t - 16) / (256 - 16)) * (A.x1 - A.x0);

interface Series {
	id: string;
	title: string;
	values: number[];
	domain: [number, number];
	ticks: number[];
	band: readonly [number, number];
}

const SERIES: Series[] = [
	{ id: 'flops', title: 'FLOPs (T)', values: FLOPS, domain: [1, 4.5], ticks: [1, 2, 3, 4], band: A.top },
	{ id: 'time', title: 'Latency (s)', values: TIME, domain: [0.18, 0.24], ticks: [0.18, 0.2, 0.22, 0.24], band: A.bot },
];

const sy = (s: Series, v: number) =>
	s.band[1] - ((v - s.domain[0]) / (s.domain[1] - s.domain[0])) * (s.band[1] - s.band[0]);

/* ── (b) / (c) heatmaps ─────────────────────────────────────────────────── */

/** Bottom of the layer-wise colour bar; its top is 1.0. */
const B_MIN = 0.277;

/** Layer i vs layer j, 1-indexed. */
const layerSim = (i: number, j: number) => LAYERS[i - 1][j - 1];

/** Grid puts row i=1 at the bottom; the paper puts step 1 at the top. */
const stepSim = (key: keyof typeof STEPS) => (i: number, j: number) => STEPS[key][10 - i][j - 1];

interface GridProps {
	n: number;
	x: number;
	y: number;
	size: number;
	value: (i: number, j: number) => number;
	/** Value mapped to the light and dark ends of the colour scale. */
	range: [number, number];
	onHover: (text: string | null) => void;
	describe: (i: number, j: number, v: number) => string;
}

/** Row i=1 sits at the bottom, as in the paper. */
function Grid({ n, x, y, size, value, range, onHover, describe }: GridProps) {
	const c = size / n;
	const cells = [];
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= n; j++) {
			const v = value(i, j);
			cells.push(
				<rect
					key={`${i}-${j}`}
					x={x + (j - 1) * c}
					y={y + (n - i) * c}
					width={c + 0.3}
					height={c + 0.3}
					fill={ylgnbu((v - range[0]) / (range[1] - range[0]))}
					className="red__cell"
					onPointerEnter={() => onHover(describe(i, j, v))}
				/>,
			);
		}
	}
	return (
		<g onPointerLeave={() => onHover(null)} aria-hidden="true">
			{cells}
		</g>
	);
}

/** Vertical YlGnBu bar with optional tick labels, as beside each paper heatmap. */
function ColorBar({ id, x, y, w, h, ticks }: { id: string; x: number; y: number; w: number; h: number; ticks?: { v: number; t: number }[] }) {
	return (
		<g aria-hidden="true">
			<defs>
				<linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
					{YLGNBU.map((c, i) => (
						<stop key={c} offset={i / (YLGNBU.length - 1)} stopColor={c} />
					))}
				</linearGradient>
			</defs>
			<rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
			{ticks?.map(({ v, t }) => (
				<text key={v} x={x + w + 3} y={y + h - t * h + 3} className="red__cbar-tick">
					{v.toFixed(1)}
				</text>
			))}
		</g>
	);
}

/**
 * Centre a panel's caption under its plot rather than under the whole SVG,
 * whose axes and colour bars make the drawing sit off-centre. The SVG is
 * 300 units wide and the caption spans the same width, so a percentage
 * translate maps one to one.
 */
const labelShift = (cx: number) => ({ transform: `translateX(${((cx - 150) / 300) * 100}%)` });

/* ── component ──────────────────────────────────────────────────────────── */

export default function Redundancy({ wide = false }: { wide?: boolean }) {
	const [, setHover] = useState<string | null>(null);
	const [cursor, setCursor] = useState<number | null>(null);
	const fire = useRef(trackOnce('interact-efficientvla-redundancy', 'EfficientVLA redundancy figure'));

	const show = (text: string | null) => {
		if (text) fire.current();
		setHover(text);
	};

	/** Snap the crosshair to the nearest measured token count. */
	const onMove = (e: React.PointerEvent<SVGRectElement>) => {
		const svg = e.currentTarget.ownerSVGElement!;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const local = pt.matrixTransform(svg.getScreenCTM()!.inverse());
		let best = 0;
		TOKENS.forEach((t, i) => {
			if (Math.abs(ax(t) - local.x) < Math.abs(ax(TOKENS[best]) - local.x)) best = i;
		});
		setCursor(best);
		fire.current();
		setHover(
			`${TOKENS[best]} visual tokens · ${FLOPS[best].toFixed(2)} TFLOPs · ${TIME[best].toFixed(3)} s · ${
				TOKENS[best] <= KNEE ? 'memory-bound' : 'compute-bound'
			}`,
		);
	};

	const B = { x: 26, y: 10, size: 236 };
	const C = { size: 92, cols: [10, 146], rows: [20, 166] };

	return (
		<figure className={`arch red${wide ? ' wide' : ''}`}>
			<div className="red__panels">
				{/* ── (a) ── */}
				<div className="red__panel">
					<svg
						className="red__svg"
						viewBox="0 0 300 300"
						role="img"
						aria-label="FLOPs and latency against the number of visual tokens. FLOPs rise linearly from 1.27 T at 16 tokens to 4.19 T at 256. Latency stays flat near 0.19 s up to about 112 tokens, where inference is memory-bound, then climbs to 0.234 s once it becomes compute-bound."
					>
						{SERIES.map((s) => (
							<g key={s.id}>
								{/* memory-bound regime */}
								<rect x={A.x0} y={s.band[0]} width={ax(KNEE) - A.x0} height={s.band[1] - s.band[0]} className="red__regime" />
								{s.ticks.map((t) => (
									<g key={t}>
										<path d={`M${A.x0} ${sy(s, t)} H${A.x1}`} className="bch__grid" />
										<text x={A.x0 - 6} y={sy(s, t) + 3.5} className="bch__tick">
											{s.id === 'time' ? t.toFixed(2) : t}
										</text>
									</g>
								))}
								<path d={`M${A.x0} ${s.band[1]} H${A.x1}`} className="bch__grid bch__grid--base" />
								<text x={A.x0} y={s.band[0] - 8} className="red__chart-title">
									{s.title}
								</text>
								<path
									d={s.values.map((v, i) => `${i ? 'L' : 'M'}${ax(TOKENS[i])} ${sy(s, v)}`).join(' ')}
									className="red__line"
								/>
								{s.values.map((v, i) => (
									<circle
										key={i}
										cx={ax(TOKENS[i])}
										cy={sy(s, v)}
										r={cursor === i ? 4.5 : 3}
										className="red__dot"
									/>
								))}
							</g>
						))}

						<text x={(A.x0 + ax(KNEE)) / 2} y={A.bot[0] + 14} className="red__regime-label">
							Memory-bound
						</text>
						<text x={(ax(KNEE) + A.x1) / 2} y={A.bot[0] + 14} className="red__regime-label">
							Compute-bound
						</text>

						{/* shared x-axis */}
						{[16, 56, 112, 176, 256].map((t) => (
							<text key={t} x={ax(t)} y={A.bot[1] + 14} className="bch__cat">
								{t}
							</text>
						))}
						<text x={(A.x0 + A.x1) / 2} y={296} className="bch__axis-title">
							Number of visual tokens
						</text>

						{cursor !== null && (
							<path d={`M${ax(TOKENS[cursor])} ${A.top[0]} V${A.bot[1]}`} className="red__crosshair" />
						)}
						<rect
							x={A.x0 - 10}
							y={A.top[0] - 10}
							width={A.x1 - A.x0 + 20}
							height={A.bot[1] - A.top[0] + 20}
							className="red__hit"
							onPointerMove={onMove}
							onPointerLeave={() => {
								setCursor(null);
								setHover(null);
							}}
						/>
					</svg>
					<p className="red__label" style={labelShift((A.x0 + A.x1) / 2)}>(a) Token-wise inference bottleneck</p>
				</div>

				{/* ── (b) ── */}
				<div className="red__panel">
					<svg
						className="red__svg"
						viewBox="0 0 300 300"
						role="img"
						aria-label="Cosine similarity between the outputs of every pair of the 32 LLM layers. Apart from the first and last layers, deep layers are highly similar to one another, so many of them are redundant."
					>
						<Grid
							n={32}
							x={B.x}
							y={B.y}
							size={B.size}
							value={layerSim}
							range={[B_MIN, 1]}
							onHover={show}
							describe={(i, j, v) => `Layer ${i} vs layer ${j} · similarity ${v.toFixed(2)}`}
						/>
						{[1, 8, 16, 24, 32].map((l) => {
							const c = B.size / 32;
							return (
								<g key={l}>
									<text x={B.x + (l - 0.5) * c} y={B.y + B.size + 12} className="red__tick red__tick--mid">
										{l}
									</text>
									<text
										className="red__tick red__tick--mid"
										transform={`translate(${B.x - 6} ${B.y + B.size - (l - 0.5) * c}) rotate(-90)`}
									>
										{l}
									</text>
								</g>
							);
						})}
						<ColorBar
							id="red-cbar-b"
							x={B.x + B.size + 8}
							y={B.y}
							w={10}
							h={B.size}
							ticks={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => ({ v, t: (v - B_MIN) / (1 - B_MIN) }))}
						/>
					</svg>
					<p className="red__label" style={labelShift(B.x + B.size / 2)}>(b) Layer-wise output similarity</p>
				</div>

				{/* ── (c) ── */}
				<div className="red__panel">
					<svg
						className="red__svg"
						viewBox="0 0 300 300"
						role="img"
						aria-label="Cosine similarity between action-head outputs at different denoising timesteps, for attention and MLP at layers 0 and 4. Attention outputs stay similar across many steps; MLP outputs are similar mainly between neighbouring steps."
					>
						{(['attn', 'mlp'] as const).map((kind, r) =>
							[0, 4].map((layer, col) => (
								<g key={`${kind}-${layer}`}>
									<Grid
										n={10}
										x={C.cols[col]}
										y={C.rows[r]}
										size={C.size}
										value={stepSim(`${kind}${layer}` as keyof typeof STEPS)}
										range={[0, 1]}
										onHover={show}
										describe={(i, j, v) =>
											`${kind === 'attn' ? 'Attention' : 'MLP'}, layer ${layer} · step ${11 - i} vs step ${j} · relative similarity ${v.toFixed(2)}`
										}
									/>
									<ColorBar id={`red-cbar-c-${kind}-${layer}`} x={C.cols[col] + C.size + 6} y={C.rows[r]} w={5} h={C.size} />
								</g>
							)),
						)}
						{/* layer labels sit between the rows, as in the paper */}
						{[0, 4].map((layer, col) => (
							<text key={layer} x={C.cols[col] + C.size / 2} y={C.rows[0] + C.size + 26} className="red__serif">
								Layer = {layer}
							</text>
						))}
						{['Attention', 'MLP'].map((label, r) => (
							<text
								key={label}
								className="red__serif"
								transform={`translate(${C.cols[1] + C.size + 26} ${C.rows[r] + C.size / 2}) rotate(-90)`}
							>
								{label}
							</text>
						))}
					</svg>
					<p className="red__label" style={labelShift((C.cols[0] + C.cols[1] + C.size) / 2)}>(c) Timestep-wise output similarity</p>
				</div>
			</div>

			<figcaption className="arch__caption">
				(a) Below ~112 visual tokens inference is memory-bound, so cutting tokens alone barely helps latency. <br/>
				(b) Deep layers produce nearly the same output, so some can be pruned. <br/>
				(c) The action head&rsquo;s attention and MLP outputs repeat across denoising steps, so they can be cached.
			</figcaption>
		</figure>
	);
}
