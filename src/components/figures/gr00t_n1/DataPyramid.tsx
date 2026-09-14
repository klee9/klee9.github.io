import { useRef, useState, type KeyboardEvent } from 'react';
import { trackOnce } from '../../../lib/analytics';

/**
 * The GR00T N1 data pyramid as an interactive SVG: a wide base of web and human
 * video, a middle band of synthetic trajectories, and a narrow top of real
 * robot demonstrations. Select a tier to read what it contributes and what it
 * cannot.
 *
 * Drawn from scratch in the site's own visual language (no photographs or
 * dataset logos), so it themes, scales, and reacts like the rest of the page.
 *
 * Usage in an .mdx post:
 *   import DataPyramid from '../../components/figures/DataPyramid';
 *   <DataPyramid />
 */

/** Pyramid geometry: apex at (CX, APEX_Y); half-width grows 1:1 with depth. */
const CX = 340;
const APEX_Y = 70;
const halfWidth = (y: number) => y - APEX_Y;
const rightEdge = (y: number) => CX + halfWidth(y);

type Point = [number, number];

/** Corner radius of the bands. */
const CORNER = 15;

/** The trapezoid between two depths, as its four corner points. */
function band(yTop: number, yBottom: number): Point[] {
	return [
		[CX - halfWidth(yTop), yTop],
		[CX + halfWidth(yTop), yTop],
		[CX + halfWidth(yBottom), yBottom],
		[CX - halfWidth(yBottom), yBottom],
	];
}

/** A point `dist` along the segment from → to, never past its midpoint. */
function toward([fx, fy]: Point, [tx, ty]: Point, dist: number): Point {
	const dx = tx - fx;
	const dy = ty - fy;
	const len = Math.hypot(dx, dy) || 1;
	const t = Math.min(dist, len / 2) / len;
	return [fx + dx * t, fy + dy * t];
}

/**
 * A polygon with rounded corners. SVG has no border-radius for polygons, so
 * every vertex becomes a quadratic curve between two points set back along its
 * edges — which handles the slanted sides, and the clamp in `toward` keeps the
 * narrow top band from folding in on itself.
 */
function roundedPath(points: Point[], r: number) {
	const n = points.length;
	const fmt = ([x, y]: Point) => `${x.toFixed(2)} ${y.toFixed(2)}`;
	return (
		points
			.map((cur, i) => {
				const start = toward(cur, points[(i - 1 + n) % n], r);
				const end = toward(cur, points[(i + 1) % n], r);
				return `${i === 0 ? 'M' : 'L'}${fmt(start)} Q${fmt(cur)} ${fmt(end)}`;
			})
			.join(' ') + ' Z'
	);
}

const NOTE_X = 690;

interface Tier {
	id: string;
	tone: 'real' | 'sim' | 'web';
	/** Label lines drawn inside the band. */
	lines: string[];
	yTop: number;
	yBottom: number;
	/** Vertical anchor for the label block and the side note. */
	labelY: number;
	note: string;
	title: string;
	body: string;
}

const TIERS: Tier[] = [
	{
		id: 'real',
		tone: 'real',
		lines: ['Real-world', 'data'],
		yTop: 90,
		yBottom: 170,
		labelY: 126,
		note: 'scarce · true actions',
		title: 'Real-world robot data',
		body: 'Teleoperated demonstrations collected on the physical robot. This is the only tier with real actions on the target embodiment. (Includes: GR00T N1 Humanoid Pre-Training Dataset, OpenX-Embodiment, AgiBot-Alpha)',
	},
	{
		id: 'sim',
		tone: 'sim',
		lines: ['Synthetic data'],
		yTop: 175,
		yBottom: 280,
		labelY: 230,
		note: 'cheap · approximate physics',
		title: 'Synthetic data',
		body: 'Trajectories produced in simulation and by video generation models.',
	},
	{
		id: 'web',
		tone: 'web',
		lines: ['Web data & human video'],
		yTop: 285,
		yBottom: 390,
		labelY: 340,
		note: 'abundant · no actions',
		title: 'Web data and human video',
		body: 'Internet-scale images, text, and egocentric human video. (Includes: Ego4D, Ego-Exo4D, Assembly-101, EPIC-KITCHENS, HOI4D, HoloAssist, RH20T-Human)',
	},
];

export default function DataPyramid({ wide = false }: { wide?: boolean }) {
	const [selected, setSelected] = useState<string | null>(null);
	const fire = useRef(trackOnce('interact-groot-data-pyramid', 'GR00T data pyramid'));

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

	const tier = TIERS.find((t) => t.id === selected);
	const isDim = (id: string) => (selected && selected !== id ? 'is-dim' : '');

	return (
		<figure className={`arch${wide ? ' wide' : ''}`}>
			<div className="arch__scroll">
				<svg
					className="arch__svg pyr"
					/* cropped to the pyramid itself — the apex starts at y=90 */
					viewBox="0 78 880 324"
					role="img"
					aria-label="The GR00T N1 data pyramid: a wide base of web data and human video, a middle band of synthetic data, and a narrow top of real-world robot data."
				>
					{TIERS.map((t) => (
						<g
							key={t.id}
							className={`pyr__tier pyr__tier--${t.tone} ${selected === t.id ? 'is-active' : ''} ${isDim(t.id)}`}
							role="button"
							tabIndex={0}
							aria-pressed={selected === t.id}
							aria-label={t.title}
							onClick={() => pick(t.id)}
							onKeyDown={(e) => onKey(e, t.id)}
						>
							<path d={roundedPath(band(t.yTop, t.yBottom), CORNER)} className="pyr__band" />
							{t.lines.map((line, i) => (
								<text
									key={line}
									x={CX}
									y={t.labelY + i * 16}
									className={`pyr__label ${t.lines.length > 1 ? 'pyr__label--sm' : ''}`}
								>
									{line}
								</text>
							))}
							{/* side note, tied to the band by a hairline leader */}
							<path d={`M${rightEdge(t.labelY) + 6} ${t.labelY - 4} H${NOTE_X - 8}`} className="pyr__leader" />
							<text x={NOTE_X} y={t.labelY} className="pyr__note">
								{t.note}
							</text>
						</g>
					))}
				</svg>
			</div>

			<figcaption className="arch__caption">
				{tier ? (
					<>
						<strong>{tier.title}.</strong> {tier.body}
					</>
				) : (
					<>
						The data pyramid GR00T N1 trains on: abundant web and human video at the base, synthetic
						trajectories in the middle, and a small crown of real robot demonstrations.{' '}
						Select a tier to see what it contributes.
					</>
				)}
			</figcaption>
		</figure>
	);
}
