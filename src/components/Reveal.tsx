import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

interface RevealProps {
	children: ReactNode;
	/** Wrapper element. */
	as?: ElementType;
	className?: string;
	/** Stagger, in seconds, applied as a transition delay. */
	delay?: number;
	style?: CSSProperties;
}

/**
 * Fades and lifts its children in when they scroll into view — the
 * "content arrives as you reach it" effect. Pure CSS transition; this only
 * flips a class once via IntersectionObserver. The pre-rendered HTML is
 * fully visible without JavaScript (see .reveal in global.css).
 */
export default function Reveal({ children, as: Tag = 'div', className = '', delay = 0, style }: RevealProps) {
	const ref = useRef<HTMLElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (!('IntersectionObserver' in window)) {
			el.classList.add('is-visible');
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						el.classList.add('is-visible');
						observer.disconnect();
					}
				}
			},
			{ rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<Tag
			ref={ref}
			className={`reveal ${className}`.trim()}
			style={{ ...style, '--reveal-delay': `${delay}s` } as CSSProperties}
		>
			{children}
		</Tag>
	);
}
