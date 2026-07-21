import { Outlet } from 'react-router-dom';
import Sidebar from '../Component/Sidebar.jsx';
import BuiltBy from '../Component/BuiltBy.jsx';

/**
 * Shell shared by every authenticated page except the interview room.
 * Sidebar becomes a fixed bottom tab bar below the `lg` breakpoint —
 * see Sidebar.jsx for the responsive split. `pb-20` on <main> keeps
 * content clear of that bottom bar on mobile.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 lg:flex-row">
      <Sidebar />
      <main className="flex flex-1 flex-col pb-20 lg:pb-0">
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="border-t border-white/10 px-6 py-6 text-center lg:px-12">
          <BuiltBy variant="footer" />
        </footer>
      </main>
    </div>
  );
}
