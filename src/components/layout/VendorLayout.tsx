import { Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { vendorNav } from '../../lib/navConfig';

export function VendorLayout() {
  return (
    <div className="h-screen flex flex-col">
      <Topbar brandLabel="Regantify" />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar sections={vendorNav} />
        <main className="flex-1 bg-regantify-content overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
