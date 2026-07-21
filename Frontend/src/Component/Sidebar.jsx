import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Video, Target, LogOut, Sparkles, BarChart3 } from 'lucide-react';
import { useAuth } from '../Context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/interview', label: 'Interview', icon: Video },
  { to: '/placement', label: 'Placement', icon: Target },
];

/**
 * `className` must carry the FULL spacing/size classes for each context
 * (desktop row vs. mobile column) — it is not layered on top of a
 * conflicting default here, since two plain Tailwind utilities for the
 * same property don't reliably "override" each other by string order.
 */
function NavItem({ to, label, icon: Icon, className }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center rounded-xl transition-colors ${className} ${
          isActive
            ? 'bg-white/[0.06] text-white'
            : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const isGuest = auth?.isGuest;
  const displayName = isGuest ? 'Guest' : auth?.email?.split('@')[0] || 'Student';
  const initials = isGuest
    ? 'G'
    : displayName
    .split(/[.\-_]/)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10 lg:px-4 lg:py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <Sparkles className="h-4 w-4 text-black" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight">NilGen</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} className="gap-3 px-3 py-2.5 text-sm" />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-zinc-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">
                {isGuest ? 'Guest session' : auth?.email || ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-white/10 bg-zinc-950/95 px-2 py-2 backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            className="flex-col gap-1 px-4 py-1.5 text-[11px]"
          />
        ))}
      </nav>
    </>
  );
}
