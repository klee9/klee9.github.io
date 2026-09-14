import { useRef, useState } from 'react';
import { trackOnce } from '../../../lib/analytics';

/**
 * How DexMimicGen turns one expensive human demonstration into many simulated
 * trajectories: decompose → transform → interpolate → replay and filter.
 *
 * Every step redraws the same world, so the reader watches one trajectory get
 * cut apart, moved onto a new object pose, stitched back to where the robot
 * actually is, and finally accepted or rejected by the simulator.
 *
 * Usage in an .mdx post:
 *   import DexMimicGen from '../../components/figures/DexMimicGen';
 *   <DexMimicGen />
 */

/* ── scene geometry ─────────────────────────────────────────────────────── */

const GROUND_Y = 282;
const HOME: [number, number] = [96, 238];

/** The three object-centric segments of the original demonstration. */
const SEG = {
	reach: 'M104 238 Q166 214 230 250',
	move: 'M236 250 C 300 170 444 170 508 250',
	place: 'M513 253 Q 524 264 534 272',
};

const OBJ_A: [number, number] = [238, 260]; // where the cup was picked up
const OBJ_B: [number, number] = [514, 260]; // where it was placed

/** A rigid transform of the `move` segment onto a new object pose. */
interface Placement {
	tx: number;
	ty: number;
	rot: number;
	ok: boolean;
}

const NEW_POSE: Placement = { tx: 300, ty: -34, rot: -12, ok: true };

/**
 * Two replayed candidates, one of each outcome — a scene apiece, so the
 * accept/reject rule reads directly instead of as overlapping arcs in one
 * world. `cupDx` varies where the object sits between the two scenes.
 */
const TILES: { ok: boolean; cupDx: number }[] = [
	{ ok: true, cupDx: -10 },
	{ ok: false, cupDx: 12 },
];

/** Rotation happens about the segment's first point, so that point only translates. */
const PIVOT: [number, number] = [236, 250];
const asTransform = (p: Placement) => `translate(${p.tx} ${p.ty}) rotate(${p.rot} ${PIVOT[0]} ${PIVOT[1]})`;
/** Where a transformed segment begins, once the pivot has been translated. */
const startOf = (p: Placement): [number, number] => [PIVOT[0] + p.tx, PIVOT[1] + p.ty];

/* ── steps ──────────────────────────────────────────────────────────────── */

interface Step {
	id: string;
	label: string;
	title: string;
	body: string;
}

const STEPS: Step[] = [
	{
		id: 'demo',
		label: 'Human demo',
		title: 'One human demonstration',
		body: 'Teleoperating a humanoid is expensive: an operator drives both arms and both hands at once. What it yields is a single long trajectory covering the whole task — pick the cup up, move it, set it down.',
	},
	{
		id: 'decompose',
		label: 'Decompose',
		title: 'Decompose into object-centric segments',
		body: 'Rather than keep one monolithic trajectory, DexMimicGen cuts it into subtask segments, each involving a single object. The long demo becomes a small library of reusable manipulation sequences.',
	},
	{
		id: 'transform',
		label: 'Transform',
		title: 'Align a segment to the object’s new pose',
		body: 'In a new simulated scene the object sits somewhere else. The segment is rigidly transformed onto that new pose — one rotation and translation applied to the whole segment — so the pose of the end effector relative to the object is preserved and the grasp still lands the same way.',
	},
	{
		id: 'interpolate',
		label: 'Interpolate',
		title: 'Interpolate into the segment',
		body: 'The robot is not standing where the transformed segment begins. DexMimicGen interpolates a motion from the robot’s current state to the start of the segment, so the stitched trajectory executes smoothly instead of jumping.',
	},
	{
		id: 'replay',
		label: 'Replay & filter',
		title: 'Replay in simulation, keep what works',
		body: 'Each stitched trajectory is replayed in the simulator, and only the runs that actually complete the task are retained. Failures are discarded, so a handful of human demos expands into a large, diverse, still-successful collection.',
	},
];

/* ── glyphs ─────────────────────────────────────────────────────────────── */

function Cup({ at, ghost = false }: { at: [number, number]; ghost?: boolean }) {
	const [x, y] = at;
	return (
		<g className={`dmg__obj${ghost ? ' dmg__obj--ghost' : ''}`} aria-hidden="true">
			<path d={`M${x - 10} ${y - 23} L${x + 10} ${y - 23} L${x + 7} ${y} L${x - 7} ${y} Z`} className="dmg__obj-body" />
			<path d={`M${x + 10} ${y - 19} q9 1 9 7 t-9 7`} className="dmg__obj-handle" />
			<path d={`M${x - 10.5} ${y - 23} H${x + 10.5}`} className="dmg__obj-rim" />
		</g>
	);
}

/** Two-finger end effector, drawn at a path endpoint. */
function Gripper({ at, angle = 0 }: { at: [number, number]; angle?: number }) {
	const [x, y] = at;
	return (
		<g className="dmg__gripper" transform={`rotate(${angle} ${x} ${y})`} aria-hidden="true">
			<path d={`M${x} ${y - 12} V${y - 5}`} />
			<path d={`M${x - 8} ${y - 5} H${x + 8}`} />
			<path d={`M${x - 8} ${y - 5} V${y + 4}`} />
			<path d={`M${x + 8} ${y - 5} V${y + 4}`} />
		</g>
	);
}

function Dot({ at, tone = '' }: { at: [number, number]; tone?: string }) {
	return <circle cx={at[0]} cy={at[1]} r={3.75} className={`dmg__dot ${tone}`} aria-hidden="true" />;
}

function Badge({ at, ok }: { at: [number, number]; ok: boolean }) {
	const [x, y] = at;
	return (
		<g className={`dmg__badge ${ok ? 'is-ok' : 'is-bad'}`} aria-hidden="true">
			<circle cx={x} cy={y} r={9} />
			<path
				d={ok ? `M${x - 4} ${y} l3 3.5 l5.5 -7` : `M${x - 3.5} ${y - 3.5} l7 7 m0 -7 l-7 7`}
				className="dmg__badge-mark"
			/>
		</g>
	);
}

export default function DexMimicGen({ wide = false }: { wide?: boolean }) {
	const [step, setStep] = useState(0);
	const fire = useRef(trackOnce('interact-dexmimicgen', 'DexMimicGen pipeline'));

	const pick = (i: number) => {
		fire.current();
		setStep(i);
	};

	const active = STEPS[step].id;
	const newStart = startOf(NEW_POSE);

	return (
		<figure className={`arch${wide ? ' wide' : ''}`}>
			<ol className="dmg__rail" aria-label="Pipeline step">
				{STEPS.map((s, i) => (
					<li key={s.id} className={`dmg__rail-item${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}>
						<button
							type="button"
							className="dmg__rail-btn"
							aria-current={i === step ? 'step' : undefined}
							onClick={() => pick(i)}
						>
							<span className="dmg__rail-dot">{i + 1}</span>
							<span className="dmg__rail-label">{s.label}</span>
						</button>
					</li>
				))}
			</ol>

			<div className="arch__scroll">
				<svg
					className="arch__svg dmg"
					viewBox="36 98 828 208"
					role="img"
					aria-label={`${STEPS[step].title}. ${STEPS[step].body}`}
				>
					<defs>
						<marker
							id="dmg-arrow"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="5"
							markerHeight="5"
							orient="auto-start-reverse"
						>
							<path d="M0 0 L10 5 L0 10 z" />
						</marker>
					</defs>

					{/* work surface — the single-world steps share it; step 5 uses tiles */}
					{active !== 'replay' && (
						<g className="dmg__table" aria-hidden="true">
							<rect x={48} y={GROUND_Y} width={800} height={9} rx={4.5} />
							<path d={`M48 ${GROUND_Y} H848`} />
						</g>
					)}

					<g key={active} className="dmg__scene">
						{active === 'demo' && (
							<>
								<Cup at={OBJ_A} />
								<Cup at={OBJ_B} ghost />
								<path
									d={`${SEG.reach} ${SEG.move} ${SEG.place}`}
									className="dmg__path dmg__path--demo"
									markerEnd="url(#dmg-arrow)"
								/>
								<Gripper at={HOME} />
								<Dot at={[534, 272]} tone="dmg__dot--demo" />
								<text x={330} y={150} className="dmg__label dmg__label--em">
									one long trajectory
								</text>
								<text x={238} y={GROUND_Y + 20} className="dmg__label">
									pick
								</text>
								<text x={514} y={GROUND_Y + 20} className="dmg__label">
									place
								</text>
							</>
						)}

						{active === 'decompose' && (
							<>
								<Cup at={OBJ_A} />
								<Cup at={OBJ_B} ghost />
								<path d={SEG.reach} className="dmg__path dmg__path--s1" markerEnd="url(#dmg-arrow)" />
								<path d={SEG.move} className="dmg__path dmg__path--s2" markerEnd="url(#dmg-arrow)" />
								<path d={SEG.place} className="dmg__path dmg__path--s3" markerEnd="url(#dmg-arrow)" />
								<Gripper at={HOME} />
								<Dot at={[233, 249]} tone="dmg__dot--s1" />
								<Dot at={[510, 250]} tone="dmg__dot--s2" />
								<Dot at={[534, 272]} tone="dmg__dot--s3" />
								<text x={158} y={196} className="dmg__label dmg__label--s1">
									reach &amp; grasp
								</text>
								<text x={372} y={158} className="dmg__label dmg__label--s2">
									move object
								</text>
								<text x={594} y={266} className="dmg__label dmg__label--s3">
									release
								</text>
							</>
						)}

						{active === 'transform' && (
							<>
								<Cup at={OBJ_A} ghost />
								<path d={SEG.move} className="dmg__path dmg__path--faint" />
								{/* a short straight leader, cup to cup: the object moved, and the segment
								    rides along with it. A swept curve here only competed with the
								    trajectory arcs it sits between. */}
								<path d="M256 264 L 522 236" className="dmg__hint" markerEnd="url(#dmg-arrow)" />
								<text x={388} y={180} className="dmg__label dmg__label--em">
									object at a new pose
								</text>
								<g transform={asTransform(NEW_POSE)}>
									<Cup at={OBJ_A} />
									<path d={SEG.move} className="dmg__path dmg__path--s2" markerEnd="url(#dmg-arrow)" />
									<Gripper at={[238, 232]} angle={-28} />
								</g>
							</>
						)}

						{active === 'interpolate' && (
							<>
								<g transform={asTransform(NEW_POSE)}>
									<Cup at={OBJ_A} />
									<path d={SEG.move} className="dmg__path dmg__path--s2" markerEnd="url(#dmg-arrow)" />
								</g>
								<path
									d={`M104 238 C 220 300 400 296 ${newStart[0] - 8} ${newStart[1] + 8}`}
									className="dmg__path dmg__path--interp"
									markerEnd="url(#dmg-arrow)"
								/>
								<Gripper at={HOME} />
								<Dot at={newStart} tone="dmg__dot--s2" />
								<text x={310} y={300} className="dmg__label dmg__label--em">
									interpolated from the robot’s current state
								</text>
							</>
						)}

						{active === 'replay' && (
							<>
								{TILES.map((t, i) => {
									const x = 126 + i * 348;
									const y = 116;
									const cupX = x + 150 + t.cupDx;
									// a miss lands beside the object instead of on it
									const endX = t.ok ? cupX : cupX + 52;
									const endY = t.ok ? y + 94 : y + 112;
									return (
										<g key={i} className={`dmg__outcome ${t.ok ? 'is-ok' : 'is-bad'}`}>
											<rect x={x} y={y} width={300} height={140} rx={14} className="dmg__tile" />
											<path d={`M${x + 24} ${y + 118} H${x + 276}`} className="dmg__tile-floor" />
											<Cup at={[cupX, y + 118]} />
											<path
												d={`M${x + 36} ${y + 58} C ${x + 96} ${y + 20}, ${endX - 56} ${y + 22}, ${endX} ${endY}`}
												className="dmg__path dmg__path--run"
												markerEnd="url(#dmg-arrow)"
											/>
											<Badge at={[x + 268, y + 28]} ok={t.ok} />
											<text
												x={x + 150}
												y={y + 164}
												className={`dmg__label ${t.ok ? 'dmg__label--ok' : 'dmg__label--bad'}`}
											>
												{t.ok ? 'kept — task completed' : 'discarded — task failed'}
											</text>
										</g>
									);
								})}
							</>
						)}
					</g>
				</svg>
			</div>

			<figcaption className="arch__caption">
				<strong>{STEPS[step].title}.</strong> {STEPS[step].body}
			</figcaption>
		</figure>
	);
}
