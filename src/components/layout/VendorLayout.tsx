import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { useVendorNav } from '../../lib/useStaffAccess';
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
  const isLms = useLocation().pathname.startsWith('/vendor/lms');
  // Back / "All orders" reopens a list where it was scrolled (see useScrollMemory).
  const mainRef = useRef<HTMLElement>(null);
  useScrollMemory(mainRef);
  // Only the pages this person's role can open (rule-plan.md Step 7); the owner gets the whole nav.
  const nav = useVendorNav();

  // Marks <body> while the vendor dashboard is open so index.css can swap its
  // white surfaces for #FAFAFD. On <body> (not this div) so dropdowns and
  // dialogs rendered into a portal get it too.
  useEffect(() => {
    document.body.classList.add('vendor-panel');
    return () => document.body.classList.remove('vendor-panel');
  }, []);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar sections={nav} mobileOpen={menuOpen} onMobileClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-[#efeff6] lg:border-l lg:border-line">
        <Topbar sections={nav} onMenuClick={() => setMenuOpen(true)} />
        <main ref={mainRef} className={`isolate flex-1 overflow-y-auto ${isLms ? "" : "p-3 sm:p-6"}`}>
          <SectionTabs sections={nav} />
          <VendorPageGate>
            <Outlet />
          </VendorPageGate>
        </main>
      </div>
      {/* "Ask AI": docked on the right, pushes the page instead of floating over it. */}
      <AssistantPanel />
      <WelcomeNote />
    </div>
  );
}
