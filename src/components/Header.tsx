import { Link } from 'react-router-dom';
import { SITE } from '../consts';
import ThemeToggle from './ThemeToggle';

export default function Header() {
	return (
		<header className="header">
			<div className="header__inner container">
				<Link to="/" className="header__logo" aria-label={`${SITE.title} home`}>
					<span className="header__orb" aria-hidden="true" />
					<span className="header__name">{SITE.title}</span>
				</Link>
				<nav className="header__nav" aria-label="Main navigation">
					<a
						href={SITE.github}
						className="header__link header__link--icon"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="GitHub"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
						</svg>
					</a>
					<ThemeToggle />
				</nav>
			</div>
		</header>
	);
}
