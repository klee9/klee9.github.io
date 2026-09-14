import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';
import 'katex/dist/katex.min.css';

/**
 * vite-react-ssg entry. At build time every route (including one per post,
 * see getStaticPaths in routes.tsx) is rendered to static HTML; in the
 * browser the same routes hydrate into a normal React Router app.
 */
export const createRoot = ViteReactSSG({ routes, basename: import.meta.env.BASE_URL });
