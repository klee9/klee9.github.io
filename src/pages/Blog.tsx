import { PageMeta } from '../layouts/BaseLayout';
import PostExplorer from '../components/PostExplorer';
import { getPublishedPosts, toPostSummary } from '../content/posts';

export default function Blog() {
	const posts = getPublishedPosts().map(toPostSummary);
	return (
		<>
			<PageMeta title="Blog" description="All posts — personal writing, paper reviews, and tech notes." />
			<div className="page-header container">
				<h1 className="page-header__title">All posts</h1>
			</div>
			<section className="posts container">
				<PostExplorer posts={posts} />
			</section>
		</>
	);
}
