import { ImpersonationBar } from '../ImpersonationBar';
import { AnnouncementBanner } from '../AnnouncementBanner';
import { MaintenanceBar, TermsGate } from '../PlatformNotices';
import { KycBanner } from '../KycBanner';
import { ResaleMoneyBanner } from '../ResaleMoneyBanner';
import { PlanRenewalBar } from '../PlanRenewalBar';
import { ChurnSurvey } from '../ChurnSurvey';
import { NpsSurvey } from '../NpsSurvey';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageLoading } from '../PageLoading';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { useVendorNav } from '../../lib/useStaffAccess';
import { withoutAdvanced, withoutFlagged } from '../../lib/navConfig';
import { useDashboardView } from '../../lib/useDashboardView';
import { useSimpleViewKeeps } from '../../lib/simpleView';
import { FullViewPageBar } from '../FullViewPageBar';
import { useVendorFeatures } from '../../lib/features';
import { VendorPageGate } from '../staff/VendorPageGate';
import { WelcomeNote } from '../staff/WelcomeNote';
import { AssistantPanel } from '../assistant/AssistantPanel';
import { SectionTabs } from './SectionTabs';
import { useScrollMemory } from '../../lib/useScrollMemory';

// Full-screen shell: sidebar fixed on the left, only the content column scrolls.
// Below lg the sidebar is a drawer, opened from the topbar's menu button.
export function VendorLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // The LMS bar is sticky, so its page gets no padding on main (it pads its own content).
  const { pathname } = useLocation();
  const isLms = pathname.startsWith('/vendor/lms');
  // Back / "All orders" reopens a list where it was scrolled (see useScrollMemory).
  const mainRef = useRef<HTMLElement>(null);
  useScrollMemory(mainRef);
  // Only the pages this person's role can open (rule-plan.md Step 7); the owner gets the whole nav.
  // ...and without pages behind a feature flag that is off for this store (super-admin-new.md Step 1).
  const flagsOn = useVendorFeatures().data?.on;
  const roleNav = useVendorNav();
  // ...and in Simple mode without the Full mode pages, except pinned or in-use ones and the page you are on
  // (SIMPLE-VIEW-plan.md Step 3). Each page stays in its own section (no separate block, 2026-10-20 rule).
  const { isSimple } = useDashboardView();
  const keep = useSimpleViewKeeps();
  const keepKey = keep.join('|');
  const nav = useMemo(
    () => withoutAdvanced(withoutFlagged(roleNav, flagsOn ?? []), !isSimple, pathname, keep),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleNav, flagsOn, isSimple, pathname, keepKey],
  );

  // Marks <body> while the vendor dashboard is open so index.css can swap its
  // white surfaces for #FAFAFD. On <body> (not this div) so dropdowns and
  // dialogs rendered into a portal get it too.
  useEffect(() => {
    document.body.classList.add('vendor-panel');
    return () => document.body.classList.remove('vendor-panel');
  }, []);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar
        sections={nav}
        mobileOpen={menuOpen}
        onMobileClose={closeMenu}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-[#efeff6] lg:border-l lg:border-line">
        <ImpersonationBar />
        <Topbar sections={nav} onMenuClick={() => setMenuOpen(true)} />


        <MaintenanceBar />
        {!isLms && <AnnouncementBanner />}
        {!isLms && <ResaleMoneyBanner />}
        <main ref={mainRef} className={`isolate flex-1 overflow-y-auto ${isLms ? "" : "p-3 sm:p-6"}`}>
          <SectionTabs sections={nav} />
          {!isLms && <FullViewPageBar />}
          <VendorPageGate>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </VendorPageGate>
        </main>
      </div>
      {/* "Ask AI": docked on the right, pushes the page instead of floating over it. */}
      <AssistantPanel />
      <WelcomeNote />
      <TermsGate />
      <ChurnSurvey />
      <NpsSurvey />
    </div>
  );
}
