import { PageMeta } from '../layouts/BaseLayout';
import { SITE } from '../consts';

export default function About() {
	return (
		<>
			<PageMeta title="About" description={`About ${SITE.author}.`} />
			<div className="about container container--narrow">
				<header className="page-header">
					<p className="eyebrow">About</p>
					<h1 className="page-header__title">About</h1>
				</header>
				<p>
					Hi, I'm {SITE.author}. This is where I write about things I'm thinking about — personal notes,
					summaries of papers I find interesting, and technical topics I'm exploring.
				</p>
			</div>
		</>
	);
}
