import type { CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageMeta } from '../layouts/BaseLayout';
import Comments from '../components/Comments';
import MathText, { stripMath } from '../components/math/MathText';
import ReadingProgress from '../components/ReadingProgress';
import { getPost, readingTime } from '../content/posts';
import { CATEGORIES } from '../consts';
import { formatDate } from '../utils/date';

export default function Post() {
	const { slug } = useParams();
	const post = slug ? getPost(slug) : undefined;
	if (!post) return <Navigate to="/404" replace />;

	const { title, description, pubDate, updatedDate, category, tags } = post.data;
	const categoryMeta = CATEGORIES[category];
	const minutesRead = readingTime(post.body);
	const Content = post.Component;

	return (
		<>
			<PageMeta title={stripMath(title)} description={stripMath(description)} />
			<ReadingProgress />
			<article className="post" style={{ '--card-accent': categoryMeta.color } as CSSProperties}>
				<header className="post__header container container--post">
					<Link to={`/blog/category/${category}`} className="post__category">
						{categoryMeta.label}
					</Link>
					<h1 className="post__title">
							<MathText text={title} />
						</h1>
					<p className="post__description">
							<MathText text={description} />
						</p>
					<div className="post__meta">
						<time dateTime={pubDate.toISOString()}>{formatDate(pubDate, 'long')}</time>
						<span className="post__reading-time">{minutesRead} min read</span>
						{updatedDate && (
							<span className="post__updated">
								Updated <time dateTime={updatedDate.toISOString()}>{formatDate(updatedDate, 'long')}</time>
							</span>
						)}
					</div>
					{tags.length > 0 && (
						<ul className="post__tags">
							{tags.map((tag) => (
								<li key={tag}>
									<span className="post__tag">#{tag}</span>
								</li>
							))}
						</ul>
					)}
				</header>
				<div className="post__content container container--post prose">
					<Content />
				</div>
				<footer className="post__footer container container--post">
					<Link to="/blog" className="post__back">
						‹ All posts
					</Link>
				</footer>
				<Comments term={post.id} />
			</article>
		</>
	);
}
