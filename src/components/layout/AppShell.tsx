import { CircleCheckBig, LogOut, Settings, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useSignOut } from '@/features/auth/useSignOut'
import { id } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { primaryNav } from '@/components/layout/nav-items'

const linkBase = 'flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors'
const sideLink = ({ isActive }: { isActive: boolean }) =>
  cn(linkBase, isActive ? 'bg-surface-hover text-fg' : 'text-muted hover:bg-surface-hover hover:text-fg')

function Brand() {
  return (
    <Link to="/app" className="flex items-center gap-2 font-semibold" aria-label={`${id.appName} – ${id.nav.home}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
        <CircleCheckBig size={18} aria-hidden />
      </span>
      {id.appName}
    </Link>
  )
}

export function AppShell() {
  const signOut = useSignOut()
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        {id.common.skipToContent}
      </a>

      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="px-1 pb-6 pt-1"><Brand /></div>
        <nav aria-label={id.nav.main} className="flex flex-1 flex-col gap-1">
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sideLink}>
              <Icon size={18} aria-hidden />{label}
            </NavLink>
          ))}
          <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
            <NavLink to="/app/settings" className={sideLink}><Settings size={18} aria-hidden />{id.nav.settings}</NavLink>
            <NavLink to="/app/profile" className={sideLink}><UserRound size={18} aria-hidden />{id.nav.profile}</NavLink>
            <button type="button" onClick={() => void signOut()} className={cn(linkBase, 'text-muted hover:bg-surface-hover hover:text-fg')}><LogOut size={18} aria-hidden />Keluar</button>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Header ringkas mobile */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <Link to="/app/settings" aria-label={id.nav.settings} className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-hover"><Settings size={20} aria-hidden /></Link>
            <Link to="/app/profile" aria-label={id.nav.profile} className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-hover"><UserRound size={20} aria-hidden /></Link>
          </div>
        </header>

        <main id="konten" className="mx-auto w-full max-w-5xl flex-1 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Navigasi bawah mobile */}
      {/* Kapsul mengambang: jarak dari tepi layar + safe-area; latar solid semi-transparan sebagai cadangan, kaca blur bila browser mendukung */}
      <nav
        aria-label={id.nav.mobile}
        className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-20 mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full border border-nav-border bg-nav p-1.5 shadow-float supports-[backdrop-filter]:bg-nav-glass supports-[backdrop-filter]:backdrop-blur-xl md:hidden"
      >
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors duration-200', isActive ? 'bg-accent-soft text-accent-text' : 'text-muted')}>
            <Icon size={20} aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
