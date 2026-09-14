/// <reference types="vite/client" />

declare module '*.mdx' {
	import type { ComponentType } from 'react';
	const Component: ComponentType;
	export default Component;
	/** Original file text, appended by the post-raw-source plugin (vite.config.ts). */
	export const rawSource: string;
}

declare module '*.md' {
	import type { ComponentType } from 'react';
	const Component: ComponentType;
	export default Component;
	/** Original file text, appended by the post-raw-source plugin (vite.config.ts). */
	export const rawSource: string;
}
