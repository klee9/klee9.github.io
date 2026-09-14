# klee9.github.io

Personal blog built with **React + TypeScript + Vite**, pre-rendered to static
HTML with [vite-react-ssg](https://github.com/Daydreamer-riri/vite-react-ssg).
Everything is `.tsx`, `.mdx`, and CSS — no framework-specific file types.

## Quick start

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # pre-renders every page into dist/, then writes rss.xml + sitemap.xml
npm run preview  # serve dist/ locally
npm run check    # type-check
```

## Write a post

Create a file in `src/content/blog/`. The file name becomes the URL
(`hello-world.mdx` → `/blog/hello-world`). Use `.mdx` when the post embeds a
React component; plain `.md` is fine otherwise.

```md
---
title: 'Hello world'
description: 'One or two sentences shown on the post card.'
pubDate: 2026-09-09
category: tech            # personal | paper | tech
tags: ['robotics', 'notes']  # optional
draft: false              # true hides the post from the built site (still visible in dev)
---

Your content here.
```

Frontmatter is validated at build time by the zod schema in
`src/content/posts.ts`, so a typo in `category` fails the build instead of
silently breaking a page.

### Math

Both `.md` and `.mdx` posts support LaTeX via KaTeX, rendered at build time
(no JavaScript shipped for static equations): `$E = mc^2$` inline, or

```md
$$
\operatorname{softmax}(x)_i = \frac{e^{x_i}}{\sum_j e^{x_j}}
$$
```

for display math.

### Interactive equations

Interactive widgets are ordinary React components in `src/components/math/`.
Drop one into an `.mdx` post with an import:

```mdx
import SoftmaxExplorer from '../../components/math/SoftmaxExplorer';

<SoftmaxExplorer labels={['the', 'cat', 'sat', 'mat']} />
```

To build a new one, copy `SoftmaxExplorer.tsx`: it uses `<Tex>` (`Tex.tsx`)
to re-render a KaTeX equation with live values, an inline SVG for the plot,
and `trackOnce()` from `src/lib/analytics.ts` to log the first interaction.
See `attention-is-all-you-need-review.mdx` for a worked example. Because pages
are pre-rendered in Node, anything touching `window` or `document` must live
inside `useEffect` (or event handlers), never at render time.

### Interactive figures

Diagrams that explain a mechanism live in `src/components/figures/` as inline
SVG, so they can be hovered, clicked, themed, and animated — unlike a PNG.
`GR00TArchitecture.tsx` is the worked example: modules are defined as a
`NODES` array (geometry + kind + explanation) and wiring as an `EDGES` array
of SVG paths, so changing the diagram means editing data, not markup.
Selecting a module dims everything else and swaps the caption; a slider
replays the denoising loop. Drop one into a post with
`<GR00TArchitecture />`, or `<GR00TArchitecture wide />` to break out of the
text column.

### Analytics

Two services are supported, configured in `ANALYTICS` in `src/consts.ts`;
enable either or both, leave a field empty to disable it. Scripts are only
emitted in production builds, so `npm run dev` never counts.

- **Google Analytics 4** (free): create a property at analytics.google.com,
  add a Web data stream, and paste the Measurement ID (`G-…`) into
  `gaMeasurementId`. Sets cookies; a consent banner is technically required
  for EU visitors, and many technical readers block it.
- **GoatCounter** (free, cookie-free): put your site code in `goatcounterCode`.
  To stop counting your own visits, open the live site once with
  `#toggle-goatcounter` appended to the URL in each browser you use.

Client-side navigations are reported as pageviews by `BaseLayout`. Inside
components, call `track('event-name')` or `trackOnce('event-name')` from
`src/lib/analytics.ts` to record custom events.

### Comments

Comments use [giscus](https://giscus.app), backed by GitHub Discussions on this
repo. One-time setup: enable Discussions on the repo, install the giscus GitHub
app, then on giscus.app enter the repo and copy the generated `repoId` and
`categoryId` into `COMMENTS` in `src/consts.ts`. The section stays hidden until
those are filled in, and follows the site's light/dark switch.

### RSS, sitemap, reading time, 404

`scripts/postbuild.mjs` runs after every build and writes `dist/rss.xml` and
`dist/sitemap.xml` from the posts' frontmatter (submit the sitemap once in
Google Search Console), and copies the pre-rendered `/404` page to `404.html`,
which GitHub Pages serves for unknown URLs. Reading time (200 wpm, code and
math excluded) is computed in `readingTime()` in `src/content/posts.ts`.

### Images

Put images in `public/` and reference them absolutely (`![caption](/images/figure.png)`),
or import them in an `.mdx` post (`import fig from './figure.png'`) and use
`<img src={fig} />` to have Vite hash and bundle them.

## Change the look

| What                        | Where                                            |
| --------------------------- | ------------------------------------------------ |
| Colors, fonts, radii        | `src/styles/theme.css`                           |
| Site name, tagline, links   | `src/consts.ts`                                  |
| Categories                  | `CATEGORIES` in `src/consts.ts`                  |
| Motion (easing, durations)  | `--ease-*` / `--dur-*` in `src/styles/theme.css` |
| Page/shell layout styles    | `src/styles/pages.css`                           |
| Card, filter, widget styles | `src/styles/components.css`                      |

The look is Apple-style: the platform's system font, large tight headlines,
generous whitespace, a frosted sticky nav, rounded gray tiles, one blue accent,
and quiet motion. Every color is a CSS variable in `theme.css`; the light
palette sits on `:root` and the dark palette under `:root[data-theme='dark']`.
The header switch toggles that attribute and remembers the choice; with no
saved choice the site follows the OS setting.

Motion lives in three primitives in `global.css`: `.rise` (staggered entrance
on first paint, used by the hero), `.page` (fade-up on every route change),
and `.reveal` (fade-up when scrolled into view, applied with the `<Reveal>`
component). All of them respect `prefers-reduced-motion`, and `.reveal` only
hides content when JavaScript is running, so pre-rendered pages stay readable
without it.

## Add a category

1. Add an entry to `CATEGORIES` in `src/consts.ts` with a `label`, `description`, and `color`.
2. Add a matching `--color-category-<name>` variable in `src/styles/theme.css`.
3. Add its label to `CATEGORY_LABELS` in `scripts/postbuild.mjs` (used by the RSS feed).

## Project layout

```
index.html              HTML shell: fonts, favicon, theme-before-paint script
vite.config.ts          MDX (+ remark-math / rehype-katex) and pre-render options
scripts/postbuild.mjs   rss.xml, sitemap.xml, 404.html
src/
├── main.tsx            vite-react-ssg entry
├── routes.tsx          React Router routes + which dynamic paths to pre-render
├── consts.ts           site metadata, categories, analytics + comments config
├── content/
│   ├── posts.ts        loads + validates posts, reading time
│   ├── frontmatter.mjs tiny YAML-frontmatter parser (shared with postbuild)
│   └── blog/           the posts (.md / .mdx)
├── layouts/BaseLayout.tsx   shell (header, footer, analytics, page transition) + <PageMeta>
├── pages/              Home, Blog, Category, Post, About, NotFound
├── components/         Header, Footer, Comments, PostCard, PostExplorer, Reveal, …
│   ├── math/           Tex.tsx, SoftmaxExplorer.tsx
│   └── figures/        interactive SVG diagrams (GR00TArchitecture)
├── lib/analytics.ts    track / trackOnce / pageview
├── styles/             theme.css · global.css · pages.css · components.css
└── utils/date.ts
```

## Deploy

`.github/workflows/deploy.yml` type-checks, builds, and publishes `dist/` to
GitHub Pages on every push to `main`. One-time setup: in the repo on GitHub go
to Settings → Pages and set **Source** to "GitHub Actions".
