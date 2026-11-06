import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, THEME_STORAGE_KEY } from '@/lib/theme'
import { ThemeSwitcher } from '@/features/settings/ThemeSwitcher'
import { mediaState } from '@/test/setup'

const renderSwitcher = () => render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>)
const isDark = () => document.documentElement.classList.contains('dark')

describe('tema', () => {
  it('default mengikuti sistem (terang)', () => {
    renderSwitcher()
    expect(screen.getByRole('radio', { name: 'Ikuti sistem' })).toBeChecked()
    expect(isDark()).toBe(false)
  })

  it('memilih Gelap menerapkan kelas dan menyimpan preferensi', async () => {
    renderSwitcher()
    await userEvent.click(screen.getByRole('radio', { name: 'Gelap' }))
    expect(isDark()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('memulihkan preferensi tersimpan saat dibuka kembali', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderSwitcher()
    expect(screen.getByRole('radio', { name: 'Gelap' })).toBeChecked()
    expect(isDark()).toBe(true)
  })

  it('mode sistem mengikuti perubahan preferensi perangkat', () => {
    renderSwitcher()
    expect(isDark()).toBe(false)
    act(() => {
      mediaState.dark = true
      mediaState.listeners.forEach((cb) => cb())
    })
    expect(isDark()).toBe(true)
  })

  it('nilai tersimpan yang tidak valid diabaikan', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'tema-asing')
    renderSwitcher()
    expect(screen.getByRole('radio', { name: 'Ikuti sistem' })).toBeChecked()
  })
})
