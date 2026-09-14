import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { SITE, ANALYTICS } from '../consts';
import { pageview } from '../lib/analytics';
import Header from '../components/Header';
import Footer from '../components/Footer';

const gaId = import.meta.env.PROD && ANALYTICS.gaMeasurementId ? ANALYTICS.gaMeasurementId : null;
const goatcounterEndpoint =
	import.meta.env.PROD && ANALYTICS.goatcounterCode
		? `https://${ANALYTICS.goatcounterCode}.goatcounter.com/count`
		: null;

/**
 * Site shell: header, footer, and the analytics scripts (production
 * builds only). Pages render into <Outlet /> and set their own <title> via
 * <PageMeta>.
 */
export default function BaseLayout() {
	const { pathname } = useLocation();

	// Client-side navigations don't reload the page, so report them as
	// pageviews. The initial load is counted by the scripts themselves, so skip
	// the first run. Also scroll to top like a real navigation would.
	const isFirst = useRef(true);
	useEffect(() => {
		if (isFirst.current) {
			isFirst.current = false;
			return;
		}
		window.scrollTo(0, 0);
		pageview(pathname);
	}, [pathname]);

	return (
		<>
			<Head>
				<meta name="description" content={SITE.description} />
				<title>{`${SITE.title} — ${SITE.tagline}`}</title>
				{gaId && <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />}
				{gaId && (
					<script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`}</script>
				)}
				{goatcounterEndpoint && (
					<script data-goatcounter={goatcounterEndpoint} async src="//gc.zgo.at/count.js" />
				)}
			</Head>
			<div className="shell">
				<Header />
				<main>
					{/* key on pathname so each route mounts fresh and plays the .page fade-up */}
					<div className="page" key={pathname}>
						<Outlet />
					</div>
				</main>
				<Footer />
			</div>
		</>
	);
}

interface PageMetaProps {
	title?: string;
	description?: string;
}

/** Per-page <title> and description; drop it at the top of any page component. */
export function PageMeta({ title, description = SITE.description }: PageMetaProps) {
	const pageTitle = title ? `${title} · ${SITE.title}` : `${SITE.title} — ${SITE.tagline}`;
	return (
		<Head>
			<title>{pageTitle}</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={description} />
			<meta property="og:type" content="website" />
		</Head>
	);
}
