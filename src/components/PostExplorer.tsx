import { useDeferredValue, useMemo, useState } from 'react';
import { CATEGORIES, type Category } from '../consts';
import type { PostSummary } from '../content/posts';
import PostRow from './PostRow';

interface PostExplorerProps {
	posts: PostSummary[];
	initialCategory?: Category | 'all';
}

type Filter = Category | 'all';

export default function PostExplorer({ posts, initialCategory = 'all' }: PostExplorerProps) {
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<Filter>(initialCategory);
	const [activeTag, setActiveTag] = useState<string | null>(null);
	const deferredQuery = useDeferredValue(query);

	const allTags = useMemo(() => {
		const counts = new Map<string, number>();
		for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	}, [posts]);

	const filtered = useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		return posts.filter((p) => {
			if (category !== 'all' && p.category !== category) return false;
			if (activeTag && !p.tags.includes(activeTag)) return false;
			if (!q) return true;
			const haystack = `${p.title} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [posts, category, activeTag, deferredQuery]);

	const filters: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		...(Object.keys(CATEGORIES) as Category[]).map((slug) => ({
			value: slug,
			label: CATEGORIES[slug].label,
		})),
	];

	const reset = () => {
		setQuery('');
		setCategory('all');
		setActiveTag(null);
	};

	const isFiltered = query !== '' || category !== 'all' || activeTag !== null;

	return (
		<div className="explorer">
			<div className="explorer__controls">
				<label className="explorer__search">
					<span className="sr-only">Search posts</span>
					<svg
						aria-hidden="true"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-3.5-3.5" />
					</svg>
					<input
						type="search"
						placeholder="Search posts"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						autoComplete="off"
					/>
				</label>

				<div className="explorer__filters" role="group" aria-label="Filter by category">
					{filters.map((f) => (
						<button
							key={f.value}
							type="button"
							className={`filter${category === f.value ? ' filter--active' : ''}`}
							aria-pressed={category === f.value}
							onClick={() => setCategory(f.value)}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{allTags.length > 0 && (
				<div className="explorer__tags" role="group" aria-label="Filter by tag">
					{allTags.map(([tag, count]) => (
						<button
							key={tag}
							type="button"
							className={`tag${activeTag === tag ? ' tag--active' : ''}`}
							aria-pressed={activeTag === tag}
							onClick={() => setActiveTag(activeTag === tag ? null : tag)}
						>
							#{tag} <span className="tag__count">{count}</span>
						</button>
					))}
				</div>
			)}

			{/* A running count is noise until something is actually filtered out. */}
			{isFiltered && (
				<div className="explorer__status" aria-live="polite">
					<span>
						{filtered.length} of {posts.length} post{posts.length === 1 ? '' : 's'}
					</span>
					<button type="button" className="explorer__reset" onClick={reset}>
						Clear
					</button>
				</div>
			)}

			{filtered.length > 0 ? (
				<ul className="posts-list">
					{filtered.map((post) => (
						<PostRow key={post.id} post={post} />
					))}
				</ul>
			) : (
				<p className="explorer__empty">
					No results. Try a different search or clear the filters.
				</p>
			)}
		</div>
	);
}
