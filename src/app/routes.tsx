import { Link, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { buttonClass } from '@/components/ui/button'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from '@/features/auth/pages'
import { GuestRoute, RequireAuth, RootRedirect } from '@/features/auth/guards'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { id } from '@/lib/i18n'

function NotFound() {
  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.common.notFound}</h1>
      <Link className={buttonClass('primary')} to="/">{id.common.backHome}</Link>
    </main>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
