import { useMemo } from 'react';
import katex from 'katex';

interface Props {
	/** TeX source, e.g. String.raw`\frac{a}{b}` */
	tex: string;
	/** Render as a centered display equation instead of inline. */
	display?: boolean;
	className?: string;
}

/**
 * Renders a TeX string with KaTeX inside a React island.
 *
 * Static math in posts is handled at build time by remark-math + rehype-katex;
 * this component is for math that changes at runtime (sliders, inputs), so
 * interactive widgets can re-render an equation with live values.
 */
export default function Tex({ tex, display = false, className }: Props) {
	const html = useMemo(
		() =>
			katex.renderToString(tex, {
				displayMode: display,
				throwOnError: false,
				strict: 'ignore',
			}),
		[tex, display],
	);
	const Tag = display ? 'div' : 'span';
	return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
