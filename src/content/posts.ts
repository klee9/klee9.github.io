import type { ComponentType } from 'react';
import { z } from 'zod';
import { CATEGORY_SLUGS, type Category } from '../consts';
import { parseFrontmatter } from './frontmatter.mjs';

/**
 * Post loader. Every .md/.mdx file in ./blog becomes a post: the compiled
 * module supplies the React component, and its `rawSource` export supplies the
 * frontmatter (validated below) and the word count for reading time.
 * The glob is eager, so this runs once at build time (and once in dev).
 * A frontmatter typo fails the build with a readable zod error.
 */

const frontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	category: z.enum(CATEGORY_SLUGS),
	tags: z.array(z.string()).default([]),
	draft: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof frontmatterSchema>;

export interface Post {
	/** URL slug, derived from the file name (`hello-world.mdx` → `hello-world`). */
	id: string;
	data: PostFrontmatter;
	/** Raw markdown body (frontmatter stripped). */
	body: string;
	Component: ComponentType;
}

/** Plain, serializable shape for cards and the explorer. */
export interface PostSummary {
	id: string;
	title: string;
	description: string;
	pubDate: string;
	category: Category;
	tags: string[];
	/** Estimated reading time in whole minutes (at least 1). */
	minutesRead: number;
}

/**
 * Every post module exports its React component (default) plus `rawSource`,
 * the file's original text — appended to the compiled module by the
 * `post-raw-source` plugin in vite.config.ts. Keeping both in one module means
 * the text can never go out of sync with the component.
 */
const modules = import.meta.glob<{ default: ComponentType; rawSource: string }>(
	'./blog/*.{md,mdx}',
	{ eager: true },
);

function slugOf(path: string): string {
	return path.replace(/^.*\//, '').replace(/\.mdx?$/, '');
}

const allPosts: Post[] = Object.entries(modules).map(([path, mod]) => {
	const source = mod.rawSource;
	if (typeof source !== 'string') {
		throw new Error(`No rawSource for ${path} — is the post-raw-source plugin in vite.config.ts?`);
	}
	const { data, body } = parseFrontmatter(source);
	const parsed = frontmatterSchema.safeParse(data);
	if (!parsed.success) {
		throw new Error(`Invalid frontmatter in ${path}:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
	}
	return { id: slugOf(path), data: parsed.data, body, Component: mod.default };
});

const WORDS_PER_MINUTE = 200;

/** Reading time from the raw body, ignoring code blocks, math, imports, and tags. */
export function readingTime(body: string | undefined): number {
	if (!body) return 1;
	const text = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/\$\$[\s\S]*?\$\$/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/\$[^$\n]*\$/g, ' ')
		.replace(/^import\s.*$/gm, ' ')
		.replace(/<[^>]+>/g, ' ');
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function toPostSummary(post: Post): PostSummary {
	const { title, description, pubDate, category, tags } = post.data;
	return {
		id: post.id,
		title,
		description,
		pubDate: pubDate.toISOString(),
		category,
		tags,
		minutesRead: readingTime(post.body),
	};
}

export function sortPostsByDate(posts: Post[]): Post[] {
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

const isPublished = (p: Post) => !p.data.draft || import.meta.env.DEV; // drafts show in dev only

export function getPublishedPosts(): Post[] {
	return sortPostsByDate(allPosts.filter(isPublished));
}

export function getPostsByCategory(category: Category): Post[] {
	return getPublishedPosts().filter((p) => p.data.category === category);
}

export function getPost(id: string): Post | undefined {
	return allPosts.find((p) => p.id === id && isPublished(p));
}
