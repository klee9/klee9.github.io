import Tex from './Tex';

export { stripMath } from '../../content/strip-math.mjs';

/**
 * Renders a plain string that may contain inline `$...$` math — post titles and
 * descriptions, figure captions, anywhere the text comes from frontmatter or a
 * data file rather than from MDX.
 *
 * Inside MDX, remark-math and rehype-katex do this at build time. Frontmatter
 * never passes through that pipeline, so a title like `Fine-Tuning $\pi_{0.5}$`
 * would otherwise render with the dollar signs showing.
 *
 * Usage:
 *   <MathText text={post.title} />
 */
export default function MathText({ text }: { text: string }) {
	return (
		<>
			{text.split(/(\$[^$]+\$)/g).map((part, i) =>
				part.startsWith('$') && part.endsWith('$') && part.length > 2 ? (
					<Tex key={i} tex={part.slice(1, -1)} />
				) : (
					part
				),
			)}
		</>
	);
}
