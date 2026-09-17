import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../consts';
import MathText from './math/MathText';
import { formatDate } from '../utils/date';
import type { PostSummary } from '../content/posts';

/**
 * One post as a row in the index: title and description on the left, category
 * and date on the right, separated from its neighbours by a hairline.
 *
 * A list rather than a grid of cards, because an index is read by scanning
 * titles down a single column — and because rows keep working at fifty posts,
 * where a wall of cards stops being scannable.
 */
export default function PostRow({ post, index = 0 }: { post: PostSummary; index?: number }) {
	const meta = CATEGORIES[post.category];
	return (
		<li
			className="row"
			/* `--row-i` staggers the entrance when the filtered set changes. */
			style={{ '--card-accent': meta.color, '--row-i': index } as CSSProperties}
		>
			<Link to={`/blog/${post.id}`} className="row__link">
				<div className="row__main">
					<h2 className="row__title">
						<MathText text={post.title} />
					</h2>
					<p className="row__description">
						<MathText text={post.description} />
					</p>
				</div>
				<div className="row__meta">
					<span className="row__category">{meta.label}</span>
					<span className="row__dates">
						<time dateTime={post.pubDate}>{formatDate(post.pubDate)}</time>
						<span className="row__reading-time">{post.minutesRead} min</span>
					</span>
				</div>
			</Link>
		</li>
	);
}
