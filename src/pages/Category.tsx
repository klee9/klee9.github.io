import { Link, Navigate, useParams } from 'react-router-dom';
import { PageMeta } from '../layouts/BaseLayout';
import PostExplorer from '../components/PostExplorer';
import { getPublishedPosts, toPostSummary } from '../content/posts';
import { CATEGORIES, isCategory } from '../consts';

export default function Category() {
	const { category } = useParams();
	if (!isCategory(category)) return <Navigate to="/blog" replace />;

	const meta = CATEGORIES[category];
	const posts = getPublishedPosts().map(toPostSummary);

	return (
		<>
			<PageMeta title={meta.label} description={meta.description} />
			<div className="page-header container">
				<Link to="/blog" className="back">
					‹ All posts
				</Link>
				<h1 className="page-header__title">{meta.label}</h1>
				<p className="page-header__description">{meta.description}</p>
			</div>
			<section className="posts container">
				<PostExplorer key={category} posts={posts} initialCategory={category} />
			</section>
		</>
	);
}
