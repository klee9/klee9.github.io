import { useRef, useState, type KeyboardEvent } from 'react';
import Tex from '../../math/Tex';
import MathText from '../../math/MathText';
import { trackOnce } from '../../../lib/analytics';

/**
 * The EfficientVLA pipeline, drawn from scratch as inline SVG so it themes,
 * scales, and can be read rather than squinted at.
 *
 * Three savings sit on one diagram — visual-token filtering inside the
 * language module, pruning of redundant intermediate layers, and caching of
 * attention/MLP features across denoising steps in the action head. Selecting
 * any of them explains what it does and dims everything else.
 *
 * Usage in an .mdx post:
 *   import Architecture from '../../components/figures/efficientvla/Architecture';
 *   <Architecture />
 */

interface Node {
	id: string;
	title: string;
	body: string;
}

const NODES: Record<string, Node> = {
	vision: {
		id: 'vision',
		title: 'Vision encoder',
		body: 'Every camera frame becomes a long sequence of visual tokens. These dominate the language module’s input, and most of them carry little of the information the task actually needs.',
	},
	text: {
		id: 'text',
		title: 'Tokenizer',
		body: 'The language instruction is tokenized and embedded alongside the visual tokens, so the language module attends across both.',
	},
	lm: {
		id: 'lm',
		title: 'Language module',
		body: 'The backbone LLM, and the memory bottleneck of the whole VLA. EfficientVLA attacks it from two sides at once: fewer tokens flowing through it, and fewer layers to flow through.',
	},
	filter: {
		id: 'filter',
		title: 'Visual token filter',
		body: 'Run once, at an early layer, so every later layer sees the shorter sequence. It keeps three sets: the $K_\\text{key}$ tokens the text attends to most, the $K_\\text{task}$ most task-relevant tokens, and $K_\\text{div}$ tokens chosen to be unlike the ones already kept — coverage that pure attention ranking misses.',
	},
	prune: {
		id: 'prune',
		title: 'Layer pruning',
		body: 'Intermediate layers whose output barely differs from their input contribute little, so they are dropped outright. No retraining, no architecture change — the layers simply stop running.',
	},
	head: {
		id: 'head',
		title: 'Diffusion action head',
		body: 'The action chunk is denoised over $N$ steps. Running the full head at every step is what makes diffusion policies expensive.',
	},
	cache: {
		id: 'cache',
		title: 'Cached attention / MLP features',
		body: 'Intermediate features change slowly between neighbouring denoising steps. EfficientVLA computes them on a few steps and reuses them on the rest, cutting most of the head’s cost.',
	},
};

/* ── geometry ───────────────────────────────────────────────────────────── */

const LM = { x: 250, y: 30, w: 374, h: 228 };
const BAR = { y: 74, h: 150, w: 28 };
const LAYERS: { x: number; label: string; pruned?: boolean }[] = [
	{ x: 264, label: 'Layer 1' },
	{ x: 300, label: 'Layer 2' },
	{ x: 396, label: 'Layer 3' },
	{ x: 456, label: 'Layer N-3', pruned: true },
	{ x: 496, label: 'Layer N-2' },
	{ x: 536, label: 'Layer N-1', pruned: true },
	{ x: 576, label: 'Layer N' },
];
const FILTER = { x: 336, y: BAR.y, w: 46, h: BAR.h };
const HEAD = { x: 662, y: 30, w: 160, h: 228 };
/** Two steps compute, the rest reuse what those two produced. */
const STEPS = [true, true, false, false, false];

/** One column of small squares standing in for a token sequence. */
function Tokens({ x, y, n, cls, pitch = 10 }: { x: number; y: number; n: number; cls: string; pitch?: number }) {
	return (
		<g className={cls} aria-hidden="true">
			{Array.from({ length: n }, (_, i) => (
				<rect key={i} x={x} y={y + i * pitch} width={8} height={8} rx={1.5} />
			))}
		</g>
	);
}

function TexBox({ x, y, w, h, tex }: { x: number; y: number; w: number; h: number; tex: string }) {
	return (
		<foreignObject x={x} y={y} width={w} height={h}>
			<div className="arch__tex">
				<Tex tex={tex} />
			</div>
		</foreignObject>
	);
}

/** Attention weights for the little heat grid — illustrative, not from the paper. */
const ATTN = [
	[0.1, 0.8, 0.2, 0.5, 0.3],
	[0.7, 0.2, 0.9, 0.3, 0.4],
	[0.3, 0.6, 0.1, 0.8, 0.2],
	[0.9, 0.3, 0.7, 0.2, 0.5],
	[0.2, 0.5, 0.4, 0.6, 0.9],
];

/** The three kept sets, drawn as the tokens that survive the filter. */
const SETS: { x: number; label: string; rule: string; n: number }[] = [
	{ x: 372, label: 'Key set', rule: '\\text{Top-}K_\\text{key}\\ \\text{attention}', n: 2 },
	{ x: 506, label: 'Task-relevant set', rule: '\\text{Top-}K_\\text{task}\\ \\text{attention}', n: 3 },
	{ x: 640, label: 'Diversity set', rule: '\\text{Top-}K_\\text{div}\\ \\text{diversity}', n: 3 },
];

export default function Architecture({ wide = false }: { wide?: boolean }) {
	const [selected, setSelected] = useState<string | null>(null);
	const fire = useRef(trackOnce('interact-efficientvla-architecture', 'EfficientVLA architecture diagram'));

	const pick = (id: string) => {
		fire.current();
		setSelected((cur) => (cur === id ? null : id));
	};
	const onKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick(id);
		}
	};

	const node = selected ? NODES[selected] : null;
	const isDim = (ids: string[]) => (selected && !ids.includes(selected) ? 'is-dim' : '');
	/** Props that make a group behave as a button without repeating the plumbing. */
	const button = (id: string) => ({
		className: `arch__node ${selected === id ? 'is-active' : ''}`,
		role: 'button',
		tabIndex: 0,
		'aria-pressed': selected === id,
		'aria-label': NODES[id].title,
		onClick: () => pick(id),
		onKeyDown: (e: KeyboardEvent<SVGGElement>) => onKey(e, id),
		onPointerEnter: () => !selected && fire.current(),
	});

	return (
		<figure className={`arch evla${wide ? ' wide' : ''}`}>
			<div className="arch__scroll">
				<svg
					className="arch__svg evla__svg"
					viewBox="0 0 980 470"
					role="img"
					aria-label="EfficientVLA: a vision encoder and tokenizer feed a language module whose visual tokens are filtered at an early layer into a key set, a task-relevant set and a diversity set, and whose redundant intermediate layers are pruned; the diffusion action head then computes attention and MLP features on a few denoising steps and reuses them on the rest to produce a 7D robot action."
					data-selected={selected ?? undefined}
				>
					<defs>
						<marker id="evla-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
							<path d="M0 0 L10 5 L0 10 z" />
						</marker>
					</defs>

					{/* ── edges ── */}
					<g className="arch__edges">
						<path d="M106 92 H118" className={`arch__edge ${isDim(['vision'])}`} markerEnd="url(#evla-arrow)" />
						<path d="M106 166 H118" className={`arch__edge ${isDim(['text'])}`} markerEnd="url(#evla-arrow)" />
						<path d="M214 92 H224" className={`arch__edge ${isDim(['vision', 'lm'])}`} markerEnd="url(#evla-arrow)" />
						<path d="M214 166 H224" className={`arch__edge ${isDim(['text', 'lm'])}`} markerEnd="url(#evla-arrow)" />
						<path d="M628 144 H658" className={`arch__edge ${isDim(['lm', 'head'])}`} markerEnd="url(#evla-arrow)" />
						<path d="M826 144 H858" className={`arch__edge ${isDim(['head', 'cache'])}`} markerEnd="url(#evla-arrow)" />
						{/* the filter hands its decision down to the panel that explains it */}
						<path d="M359 228 V262 H300 V292" className={`arch__edge arch__edge--dashed ${isDim(['filter'])}`} markerEnd="url(#evla-arrow)" />
					</g>

					{/* ── inputs ── */}
					<g className={`arch__io ${isDim(['vision'])}`}>
						<rect x={6} y={64} width={100} height={56} rx={6} className="arch__io-box" />
						<text x={56} y={88} className="arch__io-label">
							Camera
						</text>
						<text x={56} y={104} className="arch__io-label">
							frames
						</text>
					</g>
					<g className={`arch__io ${isDim(['text'])}`}>
						<rect x={6} y={140} width={100} height={52} rx={6} className="arch__io-box" />
						<text x={56} y={162} className="arch__io-label">
							“move the blue
						</text>
						<text x={56} y={178} className="arch__io-label">
							bottle”
						</text>
					</g>

					{/* ── encoders ── */}
					<g {...button('vision')} className={`${button('vision').className} ${isDim(['vision', 'lm'])}`}>
						<rect x={118} y={68} width={96} height={48} rx={7} className="arch__node-box" />
						<text x={166} y={90} className="arch__node-label">
							Vision
						</text>
						<text x={166} y={104} className="arch__node-label">
							encoder
						</text>
					</g>
					<g {...button('text')} className={`${button('text').className} ${isDim(['text', 'lm'])}`}>
						<rect x={118} y={146} width={96} height={40} rx={7} className="arch__node-box" />
						<text x={166} y={170} className="arch__node-label">
							Tokenizer
						</text>
					</g>

					{/* token strips entering the language module */}
					<g className={isDim(['vision', 'lm', 'filter'])}>
						<Tokens x={230} y={72} n={5} cls="arch__tok arch__tok--vision" />
					</g>
					<g className={isDim(['text', 'lm'])}>
						<Tokens x={230} y={150} n={3} cls="arch__tok arch__tok--text" />
					</g>

					{/* ── language module ── */}
					<g {...button('lm')} className={`${button('lm').className} arch__node--container ${isDim(['lm', 'filter', 'prune'])}`}>
						<rect x={LM.x} y={LM.y} width={LM.w} height={LM.h} rx={9} className="arch__node-box" />
						<text x={LM.x + 12} y={LM.y + 22} className="evla__group-label">
							Language module
						</text>
					</g>

					{/* plain layers */}
					<g className={isDim(['lm'])}>
						{LAYERS.filter((l) => !l.pruned).map((l) => (
							<g key={l.label}>
								<rect x={l.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={5} className="arch__bar" />
								<text
									x={l.x + BAR.w / 2}
									y={BAR.y + BAR.h / 2}
									className="arch__bar-label"
									transform={`rotate(-90 ${l.x + BAR.w / 2} ${BAR.y + BAR.h / 2})`}
								>
									{l.label}
								</text>
							</g>
						))}
						<text x={438} y={152} className="arch__bar-label">
							⋯
						</text>
					</g>

					{/* pruned layers — one control, because they are one idea */}
					<g {...button('prune')} className={`${button('prune').className} ${isDim(['prune', 'lm'])}`}>
						{LAYERS.filter((l) => l.pruned).map((l) => (
							<g key={l.label}>
								<text x={l.x + BAR.w / 2} y={BAR.y - 10} className="evla__scissor" aria-hidden="true">
									✂
								</text>
								<rect x={l.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={5} className="arch__bar evla__bar--pruned" />
								<text
									x={l.x + BAR.w / 2}
									y={BAR.y + BAR.h / 2}
									className="arch__bar-label"
									transform={`rotate(-90 ${l.x + BAR.w / 2} ${BAR.y + BAR.h / 2})`}
								>
									{l.label}
								</text>
							</g>
						))}
					</g>

					{/* the filter, and the shorter sequence leaving it */}
					<g {...button('filter')} className={`${button('filter').className} arch__node--accent ${isDim(['filter', 'lm'])}`}>
						<rect x={FILTER.x} y={FILTER.y} width={FILTER.w} height={FILTER.h} rx={5} className="arch__node-box evla__filter-box" />
						<text
							x={FILTER.x + FILTER.w / 2}
							y={FILTER.y + FILTER.h / 2}
							className="arch__node-label"
							transform={`rotate(-90 ${FILTER.x + FILTER.w / 2} ${FILTER.y + FILTER.h / 2})`}
						>
							Visual token filter
						</text>
					</g>
					<g className={isDim(['filter', 'lm'])}>
						<Tokens x={386} y={104} n={3} cls="arch__tok arch__tok--vision" />
						<Tokens x={386} y={150} n={3} cls="arch__tok arch__tok--text" />
					</g>
					{/* ── action head ── */}
					<g {...button('head')} className={`${button('head').className} arch__node--container ${isDim(['head', 'cache'])}`}>
						<rect x={HEAD.x} y={HEAD.y} width={HEAD.w} height={HEAD.h} rx={9} className="arch__node-box" />
						<text x={HEAD.x + 12} y={HEAD.y + 22} className="evla__group-label">
							Action head
						</text>
					</g>
					<g {...button('cache')} className={`${button('cache').className} ${isDim(['cache', 'head'])}`}>
						{STEPS.map((compute, i) => {
							const y = HEAD.y + 36 + i * 36;
							return (
								<g key={i}>
									<rect
										x={HEAD.x + 14}
										y={y}
										width={HEAD.w - 28}
										height={26}
										rx={5}
										className={`evla__step${compute ? '' : ' evla__step--cache'}`}
									/>
									<text x={HEAD.x + HEAD.w / 2} y={y + 17} className="evla__step-label">
										{compute ? 'Compute attn / MLP' : 'Reuse cached features'}
									</text>
								</g>
							);
						})}
						{/* the cache flowing from the computed steps into the reused ones */}
						<path
							d={`M${HEAD.x + 8} ${HEAD.y + 62} V${HEAD.y + 200}`}
							className="arch__edge arch__edge--dashed"
							markerEnd="url(#evla-arrow)"
						/>
					</g>

					{/* ── output ── */}
					<g className={isDim(['head', 'cache'])}>
						<rect x={858} y={102} width={92} height={84} rx={6} className="arch__io-box arch__io-box--dashed" />
						<TexBox x={858} y={104} w={92} h={80} tex={String.raw`\begin{matrix} \Delta x \\ \Delta \theta \\ \text{Grip} \end{matrix}`} />
						<text x={904} y={208} className="arch__io-label">
							7D robot
						</text>
						<text x={904} y={224} className="arch__io-label">
							action
						</text>
					</g>

					{/* ── how the filter chooses, in detail ── */}
					<g className={isDim(['filter'])}>
						<rect x={186} y={292} width={768} height={164} rx={10} className="evla__panel" />
						<text x={202} y={314} className="evla__group-label">
							Visual token filter
						</text>

						{/* attention grid */}
						<g aria-hidden="true">
							{ATTN.map((row, r) =>
								row.map((v, c) => (
									<rect
										key={`${r}-${c}`}
										x={216 + c * 18}
										y={334 + r * 18}
										width={17}
										height={17}
										className="evla__cell"
										fillOpacity={0.12 + v * 0.7}
									/>
								)),
							)}
						</g>
						<text x={261} y={444} className="arch__io-label">
							Attention matrix
						</text>

						{SETS.map((s) => (
							<g key={s.label}>
								<rect x={s.x} y={330} width={112} height={44} rx={6} className="evla__set-box" />
								{Array.from({ length: s.n }, (_, i) => (
									<rect
										key={i}
										x={s.x + 56 - (s.n * 16 - 4) / 2 + i * 16}
										y={344}
										width={12}
										height={12}
										rx={2}
										className="evla__set-tok"
									/>
								))}
								<text x={s.x + 56} y={394} className="evla__set-label">
									{s.label}
								</text>
								<TexBox x={s.x - 9} y={402} w={130} h={22} tex={s.rule} />
							</g>
						))}

						<TexBox
							x={604}
							y={430}
							w={340}
							h={24}
							tex={String.raw`\text{Diversity}(v_j, V_\text{key}) = 1 - \max_{v_k \in V_\text{key}} \frac{v_j \cdot v_k}{\lVert v_j \rVert_2 \lVert v_k \rVert_2}`}
						/>
					</g>
				</svg>
			</div>

			<div className="arch__controls">
				<div className="arch__legend">
					<span className="arch__legend-item">
						<span className="arch__swatch evla__swatch--vision" /> Visual tokens
					</span>
					<span className="arch__legend-item">
						<span className="arch__swatch evla__swatch--text" /> Text tokens
					</span>
					<span className="arch__legend-item">
						<span className="evla__scissor-dot">✂</span> Removed at inference
					</span>
				</div>
			</div>

			<figcaption className="arch__caption">
				{node ? (
					<>
						<strong>{node.title}.</strong> <MathText text={node.body} />
					</>
				) : (
					<>
						EfficientVLA cuts across the whole pipeline: it filters visual tokens inside the language module, prunes
						redundant layers from it, and caches the action head&rsquo;s intermediate features across denoising steps
						— all without retraining.
					</>
				)}
			</figcaption>
		</figure>
	);
}
