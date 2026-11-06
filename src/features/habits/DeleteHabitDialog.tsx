import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteHabit } from '@/features/habits/queries'
import { id } from '@/lib/i18n'
import type { Habit } from '@/types/habit'

export function DeleteHabitDialog({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const del = useDeleteHabit()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (!habit || busy) return
    setBusy(true)
    try {
      await del.mutateAsync(habit.id)
      toast({ kind: 'success', message: 'Kebiasaan berhasil dihapus.' })
      onClose()
    } catch {
      toast({ kind: 'error', message: id.errors.generic, action: { label: id.actions.retry, onClick: () => void confirm() } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={habit !== null} onClose={onClose} title="Hapus kebiasaan?">
      {habit && (
        <div className="space-y-4 text-sm">
          <p>Apakah kamu yakin ingin menghapus kebiasaan ini?</p>
          <p className="font-medium">{habit.name}</p>
          <p className="text-muted">
            Semua riwayat penyelesaian kebiasaan ini akan ikut terhapus secara permanen dan memengaruhi statistik,
            rentetan, serta kalender. Jika kamu hanya ingin berhenti, arsipkan saja agar riwayat tetap tersimpan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>{id.actions.cancel}</Button>
            <Button variant="danger" onClick={() => void confirm()} disabled={busy}>{busy ? 'Menghapus…' : id.actions.delete}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
