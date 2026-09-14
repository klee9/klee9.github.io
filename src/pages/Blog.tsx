import { PageMeta } from '../layouts/BaseLayout';
import PostExplorer from '../components/PostExplorer';
import { getPublishedPosts, toPostSummary } from '../content/posts';

export default function Blog() {
	const posts = getPublishedPosts().map(toPostSummary);
	return (
		<>
			<PageMeta title="Blog" description="All posts — personal writing, paper reviews, and tech notes." />
			<div className="page-header container">
				<p className="eyebrow">All posts</p>
				<h1 className="page-header__title">Blog</h1>
				<p className="page-header__description">
					Personal writing, paper reviews, and tech notes.
				</p>
			</div>
			<section className="posts container">
				<PostExplorer posts={posts} />
			</section>
		</>
	);
}
