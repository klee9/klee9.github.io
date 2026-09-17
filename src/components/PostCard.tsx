import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../consts';
import MathText from './math/MathText';
import { formatDate } from '../utils/date';
import type { PostSummary } from '../content/posts';

interface PostCardProps {
	post: PostSummary;
}

export default function PostCard({ post }: PostCardProps) {
	const meta = CATEGORIES[post.category];
	return (
		<article className="card" style={{ '--card-accent': meta.color } as CSSProperties}>
			<Link to={`/blog/${post.id}`} className="card__link">
				<div className="card__top">
					<span className="card__category">{meta.label}</span>
					<span className="card__meta">
						<time className="card__date" dateTime={post.pubDate}>
							{formatDate(post.pubDate)}
						</time>
						<span className="card__reading-time">{post.minutesRead} min</span>
					</span>
				</div>
				<h2 className="card__title">
					<MathText text={post.title} />
				</h2>
				<p className="card__description">
					<MathText text={post.description} />
				</p>
				{post.tags.length > 0 && (
					<ul className="card__tags" aria-label="Tags">
						{post.tags.map((tag) => (
							<li key={tag} className="card__tag">
								#{tag}
							</li>
						))}
					</ul>
				)}
				<span className="card__read">
					Read more <span aria-hidden="true">›</span>
				</span>
			</Link>
		</article>
	);
}
