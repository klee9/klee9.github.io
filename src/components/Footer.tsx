import { SITE } from '../consts';

export default function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="footer">
			<div className="footer__inner container">
				<p className="footer__copy">
					&copy; {year} {SITE.author}
				</p>
			</div>
		</footer>
	);
}
