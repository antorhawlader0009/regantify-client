import { Outlet } from 'react-router-dom';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';
import { adminNav } from '../../lib/navConfig';

export function AdminLayout() {
  return (
    <div className="h-screen flex flex-col">
      <Topbar brandLabel="Regantify Admin" />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar sections={adminNav} />
        <main className="flex-1 bg-white overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
