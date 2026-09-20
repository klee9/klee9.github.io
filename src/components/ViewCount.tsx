import { useViews } from '../lib/views';

/**
 * "1,234 views" for a page. Renders nothing until the count arrives, and
 * nothing at all if the counter is unreachable — a missing number is better
 * than a wrong one.
 */
export default function ViewCount({ path, className }: { path: string; className?: string }) {
	const views = useViews(path);
	if (views === null) return null;
	return (
		<span className={className}>
			{views.toLocaleString('en-US')} {views === 1 ? 'view' : 'views'}
		</span>
	);
}
