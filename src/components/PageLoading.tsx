import { Loader2 } from 'lucide-react';

/**
 * Shown while a page's own file downloads (PERFORMANCE-PLAN.md Step 7: pages are loaded on first open). Plain colours
 * on purpose: it renders inside the vendor, admin, LMS and POS layouts alike.
 */
export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}
