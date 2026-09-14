import type { RouteRecord } from 'vite-react-ssg';
import { CATEGORY_SLUGS } from './consts';
import { getPublishedPosts } from './content/posts';
import BaseLayout from './layouts/BaseLayout';
import Home from './pages/Home';
import About from './pages/About';
import Blog from './pages/Blog';
import Category from './pages/Category';
import Post from './pages/Post';
import NotFound from './pages/NotFound';

/**
 * Site routes. `getStaticPaths` tells the pre-renderer which dynamic URLs to
 * write to disk; anything not listed 404s on GitHub Pages.
 */
export const routes: RouteRecord[] = [
	{
		path: '/',
		Component: BaseLayout,
		children: [
			{ index: true, Component: Home },
			{ path: 'about', Component: About },
			{ path: 'blog', Component: Blog },
			{
				path: 'blog/category/:category',
				Component: Category,
				getStaticPaths: () => CATEGORY_SLUGS.map((c) => `/blog/category/${c}`),
			},
			{
				path: 'blog/:slug',
				Component: Post,
				getStaticPaths: () => getPublishedPosts().map((p) => `/blog/${p.id}`),
			},
			// Explicit /404 route → dist/404/index.html, copied to dist/404.html by
			// scripts/postbuild.mjs so GitHub Pages serves it for unknown URLs.
			{ path: '404', Component: NotFound },
			{ path: '*', Component: NotFound },
		],
	},
];
