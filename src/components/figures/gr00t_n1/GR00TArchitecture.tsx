import { useRef, useState, type KeyboardEvent } from 'react';
import Tex from '../../math/Tex';
import { trackOnce } from '../../../lib/analytics';

/**
 * Interactive diagram of the GR00T N1 architecture.
 *
 * Click (or tab to) any module to highlight it and the paths it touches, and
 * read what it does.
 *
 * Drawn from scratch as inline SVG — it explains the same architecture as the
 * figure in the paper, in this site's own visual language, so it can be
 * styled, themed, and interacted with.
 *
 * Usage in an .mdx post:
 *   import GR00TArchitecture from '../../components/figures/GR00TArchitecture';
 *   <GR00TArchitecture />
 */

type Kind = 'neutral' | 'embodiment' | 'frozen';

interface Node {
	id: string;
	label: string;
	sub?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	kind: Kind;
	title: string;
	body: string;
}

const NODES: Node[] = [
	{
		id: 'vision',
		label: 'Vision',
		sub: 'encoder',
		x: 132,
		y: 48,
		w: 96,
		h: 48,
		kind: 'neutral',
		title: 'Vision encoder',
		body: 'Each camera frame is encoded by the SigLIP vision encoder at 224x224 resolution, followed by pixel shuffle, resulting in 64 image token embeddings per frame.',
	},
	{
		id: 'text',
		label: 'Text',
		sub: 'tokenizer',
		x: 132,
		y: 126,
		w: 96,
		h: 44,
		kind: 'neutral',
		title: 'Text tokenizer',
		body: 'The language instruction is tokenized and embedded into the same space as the visual tokens, so the VLM can attend across both.',
	},
	{
		id: 'vlm',
		label: 'Eagle-2 VLM',
		// sub: 'System 2',
		x: 264,
		y: 30,
		w: 92,
		h: 150,
		kind: 'frozen',
		title: 'Eagle-2 VLM (the slow "System 2")',
		body: 'Fuses vision and language into one sequence of vision-language tokens. Note that output features of the VLM are extracted from the 12th layer of the LLM, resulting in faster inference and higher downstream policy success rate. It is kept frozen to preserve the pretrained semantics.',
	},
	{
		id: 'stateEnc',
		label: 'State encoder',
		x: 132,
		y: 196,
		w: 96,
		h: 36,
		kind: 'embodiment',
		title: 'State encoder',
		body: 'An MLP that maps the robot proprioceptive state to tokens. Embodiment-specific, because every robot has a different number of joints.',
	},
	{
		id: 'actionEnc',
		label: 'Action encoder',
		x: 132,
		y: 262,
		w: 96,
		h: 96,
		kind: 'embodiment',
		title: 'Action encoder',
		body: 'Embeds the noised action chunk $a_t \\ldots a_{t+H-1}$ — $H$ future steps predicted at once, not one step at a time. Also embodiment-specific, since the action space differs per robot.',
	},
	{
		id: 'dit',
		label: '',
		x: 410,
		y: 186,
		w: 250,
		h: 176,
		kind: 'neutral',
		title: 'DiT blocks (the fast "System 1")',
		body: '$N$ blocks alternating cross-attention, where state and action tokens query the VLM tokens, with self-attention over the action chunk itself. This is where perception turns into motion, and it runs at control rate while the VLM runs slowly.',
	},
	{
		id: 'decoder',
		label: 'Action',
		sub: 'decoder',
		x: 686,
		y: 220,
		w: 88,
		h: 104,
		kind: 'embodiment',
		title: 'Action decoder',
		body: 'An MLP head that maps processed action tokens back into the robot action space, predicting the flow matching velocity that denoises the chunk. Embodiment-specific, like the encoders.',
	},
];

interface Edge {
	from: string;
	to: string;
	d: string;
	dashed?: boolean;
}

const EDGES: Edge[] = [
	{ from: 'obs', to: 'vision', d: 'M106 76 H128' },
	{ from: 'instr', to: 'text', d: 'M106 150 H128' },
	{ from: 'vision', to: 'vlm', d: 'M228 72 H260' },
	{ from: 'text', to: 'vlm', d: 'M228 148 H260' },
	// The vision-language tokens leave the strip as one bus that branches into
	// both cross-attention blocks — they attend over the same token sequence.
	{ from: 'vlm', to: 'dit', d: 'M372 92 H442 V182' },
	{ from: 'vlm', to: 'dit', d: 'M442 92 H582 V182' },
	{ from: 'state', to: 'stateEnc', d: 'M106 214 H128' },
	{ from: 'stateEnc', to: 'dit', d: 'M228 214 H406' },
	{ from: 'action', to: 'actionEnc', d: 'M106 310 H128' },
	{ from: 'actionEnc', to: 'dit', d: 'M228 310 H406' },
	{ from: 'dit', to: 'decoder', d: 'M660 272 H670' },
	{ from: 'decoder', to: 'out', d: 'M774 272 H786' },
	{ from: 'out', to: 'motor', d: 'M866 272 H886' },
	{ from: 'loop', to: 'action', d: 'M826 330 V410 H56 V369', dashed: true },
];

const ACTION_TOKENS = 9;

const kindClass: Record<Kind, string> = {
	neutral: 'arch__node--neutral',
	embodiment: 'arch__node--embodiment',
	frozen: 'arch__node--frozen',
};

/**
 * KaTeX inside the diagram. KaTeX emits HTML, which SVG <text> cannot hold, so
 * it goes in a <foreignObject> — that scales with the viewBox like everything
 * else, and KaTeX's MathML output keeps it readable to screen readers.
 */
function TexBox({ x, y, w, h, tex }: { x: number; y: number; w: number; h: number; tex: string }) {
	return (
		<foreignObject x={x} y={y} width={w} height={h}>
			<div className="arch__tex">
				<Tex tex={tex} />
			</div>
		</foreignObject>
	);
}

/** Renders a sentence where $…$ spans are set as math. */
function MathText({ text }: { text: string }) {
	return (
		<>
			{text.split(/(\$[^$]+\$)/g).map((part, i) =>
				part.startsWith('$') && part.endsWith('$') ? (
					<Tex key={i} tex={part.slice(1, -1)} />
				) : (
					<span key={i}>{part}</span>
				),
			)}
		</>
	);
}

function Tokens({ x, y, n, cls, pitch = 10 }: { x: number; y: number; n: number; cls: string; pitch?: number }) {
	return (
		<g className={cls} aria-hidden="true">
			{Array.from({ length: n }, (_, i) => (
				<rect key={i} x={x} y={y + i * pitch} width={8} height={8} rx={1.5} />
			))}
		</g>
	);
}

export default function GR00TArchitecture({ wide = false }: { wide?: boolean }) {
	const [selected, setSelected] = useState<string | null>(null);
	const fire = useRef(trackOnce('interact-groot-architecture', 'GR00T architecture diagram'));

	const pick = (id: string | null) => {
		fire.current();
		setSelected((cur) => (cur === id ? null : id));
	};
	const onKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick(id);
		}
	};

	const node = NODES.find((n) => n.id === selected);
	const isDim = (ids: string[]) => (selected && !ids.includes(selected) ? 'is-dim' : '');

	return (
		<figure className={`arch${wide ? ' wide' : ''}`}>
			<div className="arch__scroll">
				<svg
					className="arch__svg"
					viewBox="0 0 960 430"
					role="img"
					aria-label="GR00T N1 architecture: vision and language are encoded by a frozen Eagle-2 VLM, whose tokens are cross-attended by DiT blocks together with robot state and a noised action chunk, then decoded into motor actions over K denoising iterations."
					data-selected={selected ?? undefined}
				>
					<defs>
						<marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
							<path d="M0 0 L10 5 L0 10 z" />
						</marker>
					</defs>

					{/* ── edges ── */}
					<g className="arch__edges">
						{EDGES.map((e, i) => (
							<path
								key={i}
								d={e.d}
								className={`arch__edge ${e.dashed ? 'arch__edge--dashed' : ''} ${isDim([e.from, e.to])}`}
								markerEnd="url(#arch-arrow)"
							/>
						))}
					</g>

					{/* ── inputs ── */}
					<g className={`arch__io ${isDim(['vision'])}`}>
						<rect x={6} y={44} width={100} height={64} rx={6} className="arch__io-box" />
						<text x={56} y={72} className="arch__io-label">
							Camera
						</text>
						<text x={56} y={88} className="arch__io-label">
							frames
						</text>
					</g>
					<g className={`arch__io ${isDim(['text'])}`}>
						<rect x={6} y={124} width={100} height={52} rx={6} className="arch__io-box" />
						<text x={56} y={146} className="arch__io-label">
							“Pick up the
						</text>
						<text x={56} y={162} className="arch__io-label">
							apple”
						</text>
					</g>
					<g className={`arch__io ${isDim(['stateEnc'])}`}>
						<rect x={6} y={196} width={100} height={36} rx={6} className="arch__io-box" />
						<TexBox x={6} y={196} w={100} h={36} tex={String.raw`\text{Robot state } q_t`} />
					</g>
					<g className={`arch__io ${isDim(['actionEnc', 'decoder'])}`}>
						<rect x={6} y={250} width={100} height={112} rx={6} className="arch__io-box arch__io-box--dashed" />
						<text x={56} y={272} className="arch__io-label">
							Noised action
						</text>
						<TexBox
							x={6}
							y={280}
							w={100}
							h={78}
							tex={String.raw`\begin{matrix} a_t \\ a_{t+1} \\ \vdots \\ a_{t+H-1} \end{matrix}`}
						/>
					</g>

					{/* ── token strips ── */}
					<g className={isDim(['vision', 'vlm'])}>
						<Tokens x={238} y={40} n={5} cls="arch__tok arch__tok--vision" />
					</g>
					<g className={isDim(['text', 'vlm'])}>
						<Tokens x={238} y={126} n={4} cls="arch__tok arch__tok--text" />
					</g>
					<g className={isDim(['vlm', 'dit'])}>
						<Tokens x={362} y={40} n={5} cls="arch__tok arch__tok--vision" />
						<Tokens x={362} y={100} n={4} cls="arch__tok arch__tok--text" />
					</g>
					<g className={isDim(['stateEnc', 'dit'])}>
						<Tokens x={380} y={205} n={2} cls="arch__tok arch__tok--state" />
					</g>

					<g className={isDim(['actionEnc', 'dit', 'loop'])}>
						<Tokens x={380} y={262} n={ACTION_TOKENS} cls="arch__tok arch__tok--action" />
					</g>

					{/* ── DiT internals ── */}
					<g className={isDim(['dit'])}>
						{[
							{ x: 420, label: 'Cross-Attention' },
							{ x: 470, label: 'Self-Attention' },
							{ x: 560, label: 'Cross-Attention' },
							{ x: 610, label: 'Self-Attention' },
						].map((bar) => (
							<g key={bar.x}>
								<rect x={bar.x} y={202} width={42} height={140} rx={5} className="arch__bar" />
								<text x={bar.x + 21} y={272} className="arch__bar-label" transform={`rotate(90 ${bar.x + 21} 272)`}>
									{bar.label}
								</text>
							</g>
						))}
						<path d="M516 272 H554" className="arch__edge arch__edge--dashed" />
						<TexBox x={475} y={358} w={60} h={16} tex={String.raw`\times N`} />
					</g>

					{/* ── output tokens, actions, robot ── */}
					<g className={isDim(['dit', 'decoder'])}>
						<Tokens x={672} y={250} n={ACTION_TOKENS} cls="arch__tok arch__tok--action" />
					</g>
					<g className={isDim(['dit', 'decoder'])}>
						<Tokens x={672} y={205} n={2} cls="arch__tok arch__tok--state" />
					</g>
					<g className={isDim(['decoder'])}>
						<rect x={786} y={220} width={80} height={104} rx={6} className="arch__io-box arch__io-box--dashed" />
						<TexBox
							x={786}
							y={220}
							w={80}
							h={96}
							tex={String.raw`\begin{matrix} a_t \\ a_{t+1} \\ \vdots \\ a_{t+H-1} \end{matrix}`}
						/>
					</g>
					<g className={isDim(['decoder'])}>
						<text x={912} y={270} className="arch__io-label">
							Motor
						</text>
						<text x={912} y={286} className="arch__io-label">
							action
						</text>
					</g>
					<TexBox x={370} y={388} w={140} h={16} tex={String.raw`K \text{ denoising iterations}`} />

					{/* ── modules ── */}
					{NODES.map((n) => (
						<g
							key={n.id}
							className={`arch__node ${kindClass[n.kind]} ${n.id === 'dit' ? 'arch__node--container' : ''} ${
				selected === n.id ? 'is-active' : ''
			} ${isDim([n.id])}`}
							role="button"
							tabIndex={0}
							aria-pressed={selected === n.id}
							aria-label={n.title}
							onClick={() => pick(n.id)}
							onKeyDown={(e) => onKey(e, n.id)}
							onPointerEnter={() => !selected && fire.current()}
						>
							<rect x={n.x} y={n.y} width={n.w} height={n.h} rx={7} className="arch__node-box" />
							{n.label && (
								<text x={n.x + n.w / 2} y={n.y + n.h / 2 + (n.sub ? -2 : 4)} className="arch__node-label">
									{n.label}
								</text>
							)}
							{n.sub && (
								<text x={n.x + n.w / 2} y={n.y + n.h / 2 + 14} className="arch__node-label">
									{n.sub}
								</text>
							)}
							{n.kind === 'frozen' && (
								<text x={n.x + n.w - 12} y={n.y + 16} className="arch__frost" aria-hidden="true">
									❄
								</text>
							)}
						</g>
					))}
					<text x={545} y={372} className="arch__node-sub">
						DiT blocks
					</text>
				</svg>
			</div>

			<div className="arch__controls">
				<div className="arch__legend">
					<span className="arch__legend-item">
						<span className="arch__swatch arch__swatch--embodiment" /> Embodiment-specific
					</span>
					<span className="arch__legend-item">
						<span className="arch__frost-dot">❄</span> Pretrained &amp; frozen
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
						The GR00T N1 architecture. Select any module to see what it does.
					</>
				)}
			</figcaption>
		</figure>
	);
}
