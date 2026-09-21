import { Fragment, type ReactNode } from 'react';
import MathText from './math/MathText';

/**
 * A results table for posts — what markdown tables can't do: row groups,
 * highlighted rows, per-column alignment, automatic "best value" bolding, and
 * a caption. Scrolls sideways on narrow screens with the first column pinned.
 *
 * Cells are plain strings (or any React node). Strings understand `**bold**`
 * and inline `$math$`, so most tables need no JSX at all.
 *
 * Usage in an .mdx post:
 *
 *   import DataTable from '../../components/DataTable';
 *
 *   <DataTable
 *     caption="Success rate on SIMPLER."
 *     columns={[
 *       { label: 'Method' },
 *       { label: 'PickCan', align: 'right', best: 'max' },
 *       { label: 'FLOPs↓', align: 'right', best: 'min' },
 *     ]}
 *     groups={[
 *       {
 *         label: 'Visual Matching',
 *         rows: [
 *           { cells: ['CogACT', '91.3%', '100.0%'], tone: 'baseline' },
 *           { cells: ['**EfficientVLA** (L=28)', '95.3%', '45.1%'], tone: 'ours' },
 *         ],
 *       },
 *     ]}
 *   />
 *
 * For a table without groups, pass `rows` instead — each row is either a
 * `{ cells, tone }` object or just the array of cells.
 */

type Align = 'left' | 'center' | 'right';

export interface Column {
	label: ReactNode;
	align?: Align;
	/** Let this column's text wrap (for sentences). Other columns stay on one line. */
	wrap?: boolean;
	/** Bold the best numeric value in each group of this column. */
	best?: 'max' | 'min';
}

/**
 * - `baseline` — the reference row everything is compared against (tinted).
 * - `ours` — the method the post is about (accent tint).
 * - `muted` — a row shown for completeness that shouldn't draw the eye.
 */
export type Tone = 'baseline' | 'ours' | 'muted';

export interface Row {
	cells: ReactNode[];
	tone?: Tone;
}

export interface Group {
	label: ReactNode;
	rows: (Row | ReactNode[])[];
}

interface Props {
	columns: Column[];
	rows?: (Row | ReactNode[])[];
	groups?: Group[];
	caption?: ReactNode;
	/** Small print under the table: abbreviations, sources. */
	note?: ReactNode;
	/** Use the post's full width breakout for very wide tables. */
	wide?: boolean;
}

const asRow = (r: Row | ReactNode[]): Row => (Array.isArray(r) ? { cells: r } : r);

/** `**bold**` and `$math$` in a plain string. */
function Inline({ text }: { text: string }) {
	return (
		<>
			{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
				part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
					<strong key={i}>
						<MathText text={part.slice(2, -2)} />
					</strong>
				) : (
					<MathText key={i} text={part} />
				),
			)}
		</>
	);
}

const render = (cell: ReactNode) => (typeof cell === 'string' ? <Inline text={cell} /> : cell);

/** "91.3%", "1.93×", "−0.6", "3971.1 (↓41%)" → the leading number. */
function numeric(cell: ReactNode): number | null {
	if (typeof cell !== 'string' && typeof cell !== 'number') return null;
	const m = String(cell).replace(/\*\*/g, '').replace('−', '-').match(/-?\d+(\.\d+)?/);
	return m ? parseFloat(m[0]) : null;
}

/** For each column with `best`, the winning value within these rows. */
function bests(columns: Column[], rows: Row[]) {
	return columns.map((col, c) => {
		if (!col.best) return null;
		const values = rows.map((r) => numeric(r.cells[c])).filter((v): v is number => v !== null);
		if (!values.length) return null;
		return col.best === 'max' ? Math.max(...values) : Math.min(...values);
	});
}

function Body({ columns, rows, label }: { columns: Column[]; rows: Row[]; label?: ReactNode }) {
	const winners = bests(columns, rows);
	return (
		<tbody>
			{label !== undefined && (
				<tr className="dt__group">
					<th colSpan={columns.length} scope="colgroup">
						<span className="dt__group-label">{render(label)}</span>
					</th>
				</tr>
			)}
			{rows.map((row, r) => (
				<tr key={r} className={row.tone ? `dt__row--${row.tone}` : undefined}>
					{row.cells.map((cell, c) => {
						const col = columns[c] ?? {};
						const cls = [
							`dt__cell--${col.align ?? 'left'}`,
							col.wrap ? 'dt__cell--wrap' : '',
							winners[c] !== null && numeric(cell) === winners[c] ? 'dt__cell--best' : '',
						]
							.filter(Boolean)
							.join(' ');
						const content = render(cell);
						// The first column names the row, so it is a row header.
						return c === 0 ? (
							<th key={c} scope="row" className={cls}>
								{content}
							</th>
						) : (
							<td key={c} className={cls}>
								{content}
							</td>
						);
					})}
				</tr>
			))}
		</tbody>
	);
}

export default function DataTable({ columns, rows, groups, caption, note, wide = false }: Props) {
	return (
		<figure className={`dt${wide ? ' wide' : ''}`}>
			{/* A scrollable region has to be reachable from the keyboard. */}
			<div className="dt__scroll" tabIndex={0} role="region" aria-label={typeof caption === 'string' ? caption : 'Table'}>
				<table className="dt__table">
					<thead>
						<tr>
							{columns.map((col, c) => (
								<th
									key={c}
									scope="col"
									className={`dt__cell--${col.align ?? 'left'}${col.wrap ? ' dt__cell--wrap' : ''}`}
								>
									{render(col.label)}
								</th>
							))}
						</tr>
					</thead>
					{groups
						? groups.map((g, i) => (
								<Fragment key={i}>
									<Body columns={columns} rows={g.rows.map(asRow)} label={g.label} />
								</Fragment>
							))
						: rows && <Body columns={columns} rows={rows.map(asRow)} />}
				</table>
			</div>
			{(caption || note) && (
				<figcaption className="dt__caption">
					{caption && <span>{render(caption)}</span>}
					{note && <span className="dt__note">{render(note)}</span>}
				</figcaption>
			)}
		</figure>
	);
}
