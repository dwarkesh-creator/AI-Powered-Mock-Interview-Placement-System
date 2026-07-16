import { Outlet } from 'react-router-dom';
import Sidebar from '../Component/Sidebar.jsx';

/**
 * Shell shared by every authenticated page except the interview room.
 * Sidebar becomes a fixed bottom tab bar below the `lg` breakpoint —
 * see Sidebar.jsx for the responsive split. `pb-20` on <main> keeps
 * content clear of that bottom bar on mobile.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 lg:flex">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
