import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
	const [activeTags, setActiveTags] = useState<string[]>([]);
	/* Tags are the third filter on the page and the one that wraps to two lines,
	   so it stays folded away until asked for. */
	const [showTags, setShowTags] = useState(false);

	/**
	 * A single underline that slides between the category buttons, rather than one
	 * border per button switching on and off. Measured, because the labels are
	 * different widths.
	 */
	const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const [underline, setUnderline] = useState({ left: 0, width: 0 });
	const deferredQuery = useDeferredValue(query);

	/** Posts matching everything except the tags — the pool the tag counts describe. */
	const beforeTags = useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		return posts.filter((p) => {
			if (category !== 'all' && p.category !== category) return false;
			if (!q) return true;
			const haystack = `${p.title} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [posts, category, deferredQuery]);

	/**
	 * Every tag, with the number of posts adding it would actually leave — that
	 * is, counted against the category, the search, and the *other* selected
	 * tags. A tag that would empty the list is dimmed and unclickable, so no
	 * combination of filters can lead to a dead end.
	 *
	 * Order comes from each tag's overall frequency, not that live count, so the
	 * row stays put instead of reshuffling under the cursor on every click.
	 */
	const allTags = useMemo(() => {
		const overall = new Map<string, number>();
		for (const p of posts) for (const t of p.tags) overall.set(t, (overall.get(t) ?? 0) + 1);

		return [...overall.keys()]
			.map((tag) => {
				const others = activeTags.filter((t) => t !== tag);
				const count = beforeTags.filter(
					(p) => p.tags.includes(tag) && others.every((t) => p.tags.includes(t)),
				).length;
				return { tag, count };
			})
			.sort((a, b) => (overall.get(b.tag) ?? 0) - (overall.get(a.tag) ?? 0) || a.tag.localeCompare(b.tag));
	}, [posts, beforeTags, activeTags]);

	/** Tags narrow: a post has to carry all of the selected ones. */
	const filtered = useMemo(
		() => beforeTags.filter((p) => activeTags.every((t) => p.tags.includes(t))),
		[beforeTags, activeTags],
	);

	const filters: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		...(Object.keys(CATEGORIES) as Category[]).map((slug) => ({
			value: slug,
			label: CATEGORIES[slug].label,
		})),
	];

	useLayoutEffect(() => {
		const move = () => {
			const el = filterRefs.current[category];
			const parent = el?.parentElement;
			if (!el || !parent) return;
			const p = parent.getBoundingClientRect();
			const b = el.getBoundingClientRect();
			setUnderline({ left: b.left - p.left, width: b.width });
		};
		move();
		// The row wraps at narrow widths, so the target moves with the viewport.
		window.addEventListener('resize', move);
		return () => window.removeEventListener('resize', move);
	}, [category]);

	// Web fonts land after first paint and change the label widths under it.
	useEffect(() => {
		document.fonts?.ready.then(() => {
			const el = filterRefs.current[category];
			const parent = el?.parentElement;
			if (!el || !parent) return;
			const p = parent.getBoundingClientRect();
			const b = el.getBoundingClientRect();
			setUnderline({ left: b.left - p.left, width: b.width });
		});
	}, [category]);

	const toggleTag = (tag: string) =>
		setActiveTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));

	const reset = () => {
		setQuery('');
		setCategory('all');
		setActiveTags([]);
	};

	/**
	 * The category is not counted here: the sliding underline already shows which
	 * one is on, and "All" undoes it. The count and Clear are for the filters that
	 * are easy to lose track of — a search term, or tags behind a folded panel.
	 */
	const isFiltered = query !== '' || activeTags.length > 0;

	return (
		<div className="explorer">
			<div className="explorer__controls">
				<div className="explorer__search-group">
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
				{allTags.length > 0 && (
					<button
						type="button"
						className={`tag-toggle${showTags ? ' is-open' : ''}`}
						aria-expanded={showTags}
						aria-controls="tag-filters"
						onClick={() => setShowTags((v) => !v)}
					>
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
							<path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
							<circle cx="16" cy="7" r="2" />
							<circle cx="10" cy="17" r="2" />
						</svg>
						<span className="sr-only">
							{showTags ? 'Hide tag filters' : 'Show tag filters'}
						</span>
						{/* The panel can be closed while tags are still applied, so the
						    count keeps that state visible rather than hidden. */}
						{activeTags.length > 0 && (
							<span className="tag-toggle__count">{activeTags.length}</span>
						)}
					</button>
				)}
				</div>

				<div className="explorer__filters" role="group" aria-label="Filter by category">
					{filters.map((f) => (
						<button
							key={f.value}
							ref={(el) => {
								filterRefs.current[f.value] = el;
							}}
							type="button"
							className={`filter${category === f.value ? ' filter--active' : ''}`}
							aria-pressed={category === f.value}
							onClick={() => setCategory(f.value)}
						>
							{f.label}
						</button>
					))}
					<span
						className="explorer__underline"
						aria-hidden="true"
						style={{ transform: `translateX(${underline.left}px)`, width: underline.width }}
					/>
				</div>
			</div>

			{allTags.length > 0 && (
				<div className={`explorer__tags-wrap${showTags ? ' is-open' : ''}`} id="tag-filters">
					<div className="explorer__tags" role="group" aria-label="Filter by tag" inert={!showTags}>
					{allTags.map(({ tag, count }) => {
						const active = activeTags.includes(tag);
						return (
							<button
								key={tag}
								type="button"
								className={`tag${active ? ' tag--active' : ''}${!active && count === 0 ? ' tag--empty' : ''}`}
								aria-pressed={active}
								disabled={!active && count === 0}
								onClick={() => toggleTag(tag)}
							>
								#{tag} <span className="tag__count">{count}</span>
							</button>
							);
						})}
					</div>
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
				/* Keyed on the discrete filters so the list replays its entrance when a
				   button is clicked — but not on every keystroke while searching. */
				<ul className="posts-list" key={`${category}|${activeTags.join(',')}`}>
					{filtered.map((post, i) => (
						<PostRow key={post.id} post={post} index={i} />
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
