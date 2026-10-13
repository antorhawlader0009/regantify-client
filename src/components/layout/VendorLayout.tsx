import { ImpersonationBar } from '../ImpersonationBar';
import { AnnouncementBanner } from '../AnnouncementBanner';
import { MaintenanceBar, TermsGate } from '../PlatformNotices';
import { KycBanner } from '../KycBanner';
import { PlanRenewalBar } from '../PlanRenewalBar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { useVendorNav } from '../../lib/useStaffAccess';
import { advancedNavGroups, countAdvancedNav, withoutAdvanced } from '../../lib/navConfig';
import { useAdvancedMenu } from '../../store/advancedStore';
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
  const nav = useVendorNav();
  // Advanced pages stay out of the sidebar and tab bar until the seller turns on "Advanced menu".
  const { showAdvancedMenu, setShowAdvancedMenu } = useAdvancedMenu();
  // The sidebar lists advanced pages apart, under the normal menu, once "Advanced pages" is on (the page you are on stays in place while it is off).
  const sidebarNav = withoutAdvanced(nav, false, showAdvancedMenu ? '' : pathname);
  const shownNav = withoutAdvanced(nav, showAdvancedMenu, pathname);
  const advancedCount = countAdvancedNav(nav);

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
        sections={sidebarNav}
        mobileOpen={menuOpen}
        onMobileClose={closeMenu}
        advancedMenu={advancedCount > 0 ? { on: showAdvancedMenu, count: advancedCount, groups: advancedNavGroups(nav), onToggle: () => setShowAdvancedMenu(!showAdvancedMenu) } : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-[#efeff6] lg:border-l lg:border-line">
        <ImpersonationBar />
        <Topbar sections={nav} onMenuClick={() => setMenuOpen(true)} />


        <MaintenanceBar />
        {!isLms && <AnnouncementBanner />}
        <main ref={mainRef} className={`isolate flex-1 overflow-y-auto ${isLms ? "" : "p-3 sm:p-6"}`}>
          <SectionTabs sections={shownNav} />
          <VendorPageGate>
            <Outlet />
          </VendorPageGate>
        </main>
      </div>
      {/* "Ask AI": docked on the right, pushes the page instead of floating over it. */}
      <AssistantPanel />
      <WelcomeNote />
      <TermsGate />
    </div>
  );
}
