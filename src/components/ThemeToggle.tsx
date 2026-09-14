import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readTheme(): Theme {
	return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * Sun/moon switch. The <html data-theme> attribute is the single source of
 * truth: an inline script in BaseLayout sets it before paint, this button
 * flips it and remembers the choice in localStorage.
 */
export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>('dark');

	useEffect(() => {
		setTheme(readTheme());
	}, []);

	const toggle = () => {
		const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			/* storage unavailable (private mode etc.) — the choice just won't persist */
		}
		setTheme(next);
	};

	const isLight = theme === 'light';

	return (
		<button
			type="button"
			className="theme-toggle"
			onClick={toggle}
			aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
			title={isLight ? 'Dark mode' : 'Light mode'}
		>
			<span className="theme-toggle__track" aria-hidden="true">
				<span className="theme-toggle__thumb">
					{/* moon */}
					<svg className="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
						<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
					</svg>
					{/* sun */}
					<svg className="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
					</svg>
				</span>
			</span>
		</button>
	);
}
