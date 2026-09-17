import { Link } from 'react-router-dom';
import { PageMeta } from '../layouts/BaseLayout';

export default function NotFound() {
	return (
		<>
			<PageMeta title="Not found" description="The page you're looking for can't be found." />
			<div className="page-header container container--narrow">
				<h1 className="page-header__title">404</h1>
				<p className="page-header__description">The page you're looking for can't be found.</p>
				<p>
					<Link to="/" className="btn btn--ghost">
						Go home
					</Link>
				</p>
			</div>
		</>
	);
}
