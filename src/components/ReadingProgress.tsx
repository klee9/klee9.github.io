import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Thin accent bar at the top of the viewport that tracks scroll progress. */
export default function ReadingProgress() {
	const [progress, setProgress] = useState(0);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		let raf = 0;
		const update = () => {
			const doc = document.documentElement;
			const max = doc.scrollHeight - doc.clientHeight;
			setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
		};
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(update);
		};
		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, []);

	// Portaled to <body> so it sits outside the page shell (and outside the
	// route-transition wrapper's transform, which would otherwise capture it).
	if (!mounted) return null;
	return createPortal(
		<div
			className="reading-progress"
			role="progressbar"
			aria-label="Reading progress"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress * 100)}
			style={{ transform: `scaleX(${progress})` }}
		/>,
		document.body,
	);
}
