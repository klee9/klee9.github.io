import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '../layouts/BaseLayout';
import PostCard from '../components/PostCard';
import Reveal from '../components/Reveal';
import { getPublishedPosts, toPostSummary } from '../content/posts';
import { CATEGORIES } from '../consts';

export default function Home() {
	const recentPosts = getPublishedPosts().slice(0, 3).map(toPostSummary);

	return (
		<>
			<PageMeta />
			<section className="hero">
				<div className="hero__inner container">
					<h1 className="hero__title rise" style={{ '--rise-delay': '0.08s' } as CSSProperties}>
						About me
					</h1>
					{/* The introduction that used to live on /about. Body copy, so it
					    takes the prose treatment rather than the display sizing. */}
					<div className="hero__intro prose rise" style={{ '--rise-delay': '0.16s' } as CSSProperties}>
						<p>
							I am an undergraduate student at Chung-Ang University, Korea, interested in robotics and
							multimodal AI.
						</p>
						<p>
							This is where I document my journey through research &mdash; including paper reviews,
							implementation notes, experiments, and ideas that I find interesting.
						</p>
						<p>
							I hope these notes can be useful to others exploring similar topics, and serve as a record of
							what I have learned along the way.
						</p>
					</div>
				</div>
			</section>

			{recentPosts.length > 0 && (
				<section className="recent">
					<div className="container">
						<Reveal className="recent__header">
							<h2 className="section-title">Recent posts</h2>
							<Link to="/blog" className="recent__all">
								View all ›
							</Link>
						</Reveal>
						<div className="posts__grid">
							{recentPosts.map((post, i) => (
								<Reveal key={post.id} delay={i * 0.08}>
									<PostCard post={post} />
								</Reveal>
							))}
						</div>
					</div>
				</section>
			)}

			<section className="categories">
				<div className="container">
					<Reveal className="recent__header">
						<h2 className="section-title">Categories</h2>
					</Reveal>
					<div className="categories__grid">
						{Object.entries(CATEGORIES).map(([slug, meta], i) => (
							<Reveal key={slug} delay={i * 0.08}>
								<Link
									to={`/blog/category/${slug}`}
									className="category-card"
									style={{ '--card-accent': meta.color } as CSSProperties}
								>
									<span className="category-card__index">0{i + 1}</span>
									<h3 className="category-card__title">{meta.label}</h3>
									<p className="category-card__description">{meta.description}</p>
									<span className="category-card__link">Browse ›</span>
								</Link>
							</Reveal>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
