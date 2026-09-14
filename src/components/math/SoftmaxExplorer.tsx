import { useMemo, useRef, useState } from 'react';
import Tex from './Tex';
import { trackOnce } from '../../lib/analytics';

interface Props {
	/** Initial raw scores (logits). Four values reads well on a phone. */
	initialScores?: number[];
	/** Labels for each score, e.g. token names. */
	labels?: string[];
	/** Initial temperature τ. Attention uses τ = √d_k. */
	initialTemperature?: number;
	/** Analytics event name; set to '' to disable tracking for this instance. */
	eventName?: string;
}

const SCORE_MIN = -5;
const SCORE_MAX = 5;
const TEMP_MIN = 0.1;
const TEMP_MAX = 8;

function softmax(scores: number[], temperature: number): number[] {
	const scaled = scores.map((s) => s / temperature);
	const max = Math.max(...scaled); // subtract max for numerical stability
	const exps = scaled.map((s) => Math.exp(s - max));
	const sum = exps.reduce((a, b) => a + b, 0);
	return exps.map((e) => e / sum);
}

function entropy(p: number[]): number {
	return -p.reduce((acc, pi) => (pi > 0 ? acc + pi * Math.log2(pi) : acc), 0);
}

const fmt = (x: number, digits = 2) => x.toFixed(digits);

/**
 * Interactive softmax / scaled-attention explorer.
 *
 * Drag the score sliders and the temperature to see how
 * softmax(s / τ) redistributes probability mass. The equation below the
 * sliders is re-rendered with the live numbers so the reader can connect the
 * symbols to the values.
 *
 * Usage in MDX:
 *   import SoftmaxExplorer from '../../components/math/SoftmaxExplorer';
 *   <SoftmaxExplorer client:visible />
 */
export default function SoftmaxExplorer({
	initialScores = [2.0, 1.0, 0.5, -1.0],
	labels,
	initialTemperature = 1,
	eventName = 'interact-softmax',
}: Props) {
	const [scores, setScores] = useState<number[]>(initialScores);
	const [temperature, setTemperature] = useState(initialTemperature);
	const [hovered, setHovered] = useState<number | null>(null);
	const fire = useRef(eventName ? trackOnce(eventName, 'Softmax explorer') : () => {});

	const names = useMemo(
		() => labels ?? scores.map((_, i) => `s_${i + 1}`),
		[labels, scores.length],
	);
	const weights = useMemo(() => softmax(scores, temperature), [scores, temperature]);
	const H = useMemo(() => entropy(weights), [weights]);
	const maxH = Math.log2(scores.length);

	const updateScore = (i: number, v: number) => {
		fire.current();
		setScores((prev) => prev.map((s, j) => (j === i ? v : s)));
	};
	const updateTemp = (v: number) => {
		fire.current();
		setTemperature(v);
	};
	const reset = () => {
		setScores(initialScores);
		setTemperature(initialTemperature);
	};

	// Live equation: softmax(s/τ)_i = exp(s_i/τ) / Σ_j exp(s_j/τ) with the
	// focused (hovered) component expanded numerically.
	const i = hovered ?? 0;
	const liveTex = String.raw`
		p_{${i + 1}} = \frac{e^{\,s_{${i + 1}}/\tau}}{\sum_{j=1}^{${scores.length}} e^{\,s_j/\tau}}
		= \frac{e^{\,${fmt(scores[i], 1)}/${fmt(temperature, 1)}}}{${scores
			.map((s) => `e^{\\,${fmt(s, 1)}/${fmt(temperature, 1)}}`)
			.join(' + ')}}
		= ${fmt(weights[i], 3)}
	`;

	// Bar chart geometry (viewBox units).
	const W = 320;
	const HGT = 140;
	const padL = 8;
	const padB = 22;
	const padT = 10;
	const gap = 2; // 2px surface gap between adjacent bars
	const n = scores.length;
	const slot = (W - padL * 2) / n;
	const barW = Math.min(44, slot - gap * 2);
	const plotH = HGT - padB - padT;

	return (
		<figure className="mathx" aria-label="Interactive softmax explorer">
			<div className="mathx__controls">
				{scores.map((s, k) => (
					<label key={k} className="mathx__control">
						<span className="mathx__label">
							<Tex tex={names[k]} /> <span className="mathx__value">{fmt(s, 1)}</span>
						</span>
						<input
							type="range"
							min={SCORE_MIN}
							max={SCORE_MAX}
							step={0.1}
							value={s}
							onChange={(e) => updateScore(k, Number(e.target.value))}
							onPointerEnter={() => setHovered(k)}
							onFocus={() => setHovered(k)}
						/>
					</label>
				))}
				<label className="mathx__control mathx__control--temp">
					<span className="mathx__label">
						<Tex tex={String.raw`\tau`} /> <span className="mathx__value">{fmt(temperature, 1)}</span>
					</span>
					<input
						type="range"
						min={TEMP_MIN}
						max={TEMP_MAX}
						step={0.1}
						value={temperature}
						onChange={(e) => updateTemp(Number(e.target.value))}
					/>
				</label>
			</div>

			<svg
				className="mathx__chart"
				viewBox={`0 0 ${W} ${HGT}`}
				role="img"
				aria-label={`Softmax weights: ${weights.map((w, k) => `${names[k]} ${fmt(w)}`).join(', ')}`}
			>
				{/* baseline */}
				<line
					x1={padL}
					x2={W - padL}
					y1={padT + plotH}
					y2={padT + plotH}
					stroke="var(--color-border-strong)"
					strokeWidth={1}
				/>
				{weights.map((w, k) => {
					const h = Math.max(1, w * plotH);
					const x = padL + slot * k + (slot - barW) / 2;
					const y = padT + plotH - h;
					const active = hovered === k;
					return (
						<g
							key={k}
							onPointerEnter={() => setHovered(k)}
							onPointerLeave={() => setHovered(null)}
							style={{ cursor: 'default' }}
						>
							{/* oversized invisible hit target */}
							<rect x={padL + slot * k} y={padT} width={slot} height={plotH + padB} fill="transparent" />
							<rect
								x={x}
								y={y}
								width={barW}
								height={h}
								rx={4}
								fill={active ? 'var(--color-accent-hover)' : 'var(--color-accent)'}
								opacity={hovered === null || active ? 1 : 0.55}
								style={{ transition: 'height 120ms ease, y 120ms ease, opacity 120ms ease' }}
							/>
							{/* square off the bottom so only the data-end is rounded */}
							<rect x={x} y={padT + plotH - Math.min(4, h)} width={barW} height={Math.min(4, h)} fill={active ? 'var(--color-accent-hover)' : 'var(--color-accent)'} opacity={hovered === null || active ? 1 : 0.55} />
							<text
								x={x + barW / 2}
								y={y - 4}
								textAnchor="middle"
								fontSize={10}
								fontFamily="var(--font-mono)"
								fill="var(--color-text-muted)"
							>
								{fmt(w)}
							</text>
							<text
								x={x + barW / 2}
								y={HGT - 6}
								textAnchor="middle"
								fontSize={10}
								fontFamily="var(--font-mono)"
								fill="var(--color-text-subtle)"
							>
								{labels ? labels[k] : `s${k + 1}`}
							</text>
						</g>
					);
				})}
			</svg>

			<Tex tex={liveTex} display className="mathx__equation" />

			<figcaption className="mathx__caption">
				<span>
					Entropy <Tex tex="H(p)" /> = {fmt(H)} / {fmt(maxH)} bits
					{H / maxH > 0.95 ? ' — nearly uniform' : H / maxH < 0.3 ? ' — nearly one-hot' : ''}
				</span>
				<button type="button" className="mathx__reset" onClick={reset}>
					Reset
				</button>
			</figcaption>
		</figure>
	);
}
