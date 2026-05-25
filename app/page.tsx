import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the deal pipeline.
 * The landing/marketing page remains at the static HTML level
 * served from the repository root via GitHub Pages.
 */
export default function RootPage() {
  redirect('/deals');
}
