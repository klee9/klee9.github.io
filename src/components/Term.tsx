import { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';

/**
 * An inline glossary term: dotted-underlined in the accent color, with a short
 * definition that appears on hover (pointer) or on tap (touch).
 *
 * Two input models, deliberately kept apart:
 *
 *  - Pointer devices get the bubble from a pure CSS `:hover`, guarded by
 *    `@media (hover: hover)`. No JS, so it works in the pre-rendered HTML
 *    before (and without) hydration.
 *  - Touch devices have no hover; without the guard above they would get the
 *    browser's emulated sticky hover, which leaves bubbles stuck open. So a
 *    touch tap toggles an explicit open state instead, closed again by a tap
 *    outside or by Escape.
 *
 * Keyboard focus opens it either way. The bubble is a real element rather than
 * a `title` attribute, so it can be styled, themed, and announced by a screen
 * reader via aria-describedby.
 *
 * Usage in an .mdx post:
 *   import Term from '../../components/Term';
 *   <Term note="a benchmark for visual grounding">RefCOCOg</Term>
 */

/** Clear space to keep between the bubble and the window edge. */
const MARGIN = 12;
/** Gap between the term and the bubble, matching the CSS offset. */
const GAP = 10;

export default function Term({ note, children }: { note: string; children: ReactNode }) {
	const id = useId();
	const root = useRef<HTMLSpanElement>(null);
	const bubble = useRef<HTMLSpanElement>(null);
	const [open, setOpen] = useState(false);
	const [below, setBelow] = useState(false);

	/**
	 * Keep the bubble inside the window. CSS centres it on the term and hangs it
	 * above, which overflows for a term near a margin or near the top of the
	 * viewport, so both axes are corrected here:
	 *
	 *  - Horizontally, slide it back inside via `--term-shift`.
	 *  - Vertically, flip it below the term when there is no room above.
	 *
	 * Geometry comes from `offsetWidth`/`offsetHeight` and the term's own rect
	 * rather than the bubble's bounding box: the closed bubble carries a
	 * `scale(.96)`, and a bounding box would report that shrunken size and
	 * under-correct by a few pixels.
	 */
	const place = useCallback(() => {
		const el = bubble.current;
		const host = root.current;
		if (!el || !host) return;

		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		const term = host.getBoundingClientRect();
		const w = el.offsetWidth;
		const h = el.offsetHeight;

		// CSS anchors the bubble to the centre of the term's box; match that.
		const centre = term.left + term.width / 2;
		const overLeft = MARGIN - (centre - w / 2);
		const overRight = centre + w / 2 - (vw - MARGIN);
		const shift = overLeft > 0 ? overLeft : overRight > 0 ? -overRight : 0;
		el.style.setProperty('--term-shift', `${Math.round(shift)}px`);

		// Flip under the term only when it doesn't fit above but does fit below.
		const roomAbove = term.top - GAP - MARGIN;
		const roomBelow = vh - term.bottom - GAP - MARGIN;
		setBelow(roomAbove < h && roomBelow >= h);
	}, []);

	/** Touch only — a mouse gets the CSS hover, and a click there shouldn't pin. */
	const onPointerUp = (e: PointerEvent<HTMLSpanElement>) => {
		if (e.pointerType === 'mouse') return;
		e.preventDefault();
		place();
		setOpen((o) => !o);
	};

	// While pinned open, a tap anywhere else or Escape dismisses it, and the
	// bubble re-places itself if the viewport moves under it.
	useEffect(() => {
		if (!open) return;
		const away = (e: Event) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		const key = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', away);
		document.addEventListener('keydown', key);
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, { passive: true });
		return () => {
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', key);
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place);
		};
	}, [open, place]);

	return (
		<span
			ref={root}
			className={`term${open ? ' is-open' : ''}${below ? ' is-below' : ''}`}
			tabIndex={0}
			aria-describedby={id}
			onMouseEnter={place}
			onFocus={place}
			onPointerUp={onPointerUp}
		>
			{children}
			<span className="term__bubble" role="tooltip" id={id} ref={bubble}>
				{note}
			</span>
		</span>
	);
}
