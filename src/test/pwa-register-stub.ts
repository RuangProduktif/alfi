import { useState } from 'react'

/** Pengganti `virtual:pwa-register/react` saat tes. Atur `pwaStub` sebelum render. */
export const pwaStub = {
  needRefresh: false,
  offlineReady: false,
  updateCalls: [] as boolean[],
  registered: [] as unknown[],
}

export function useRegisterSW(options?: { onRegisteredSW?: (url: string, reg: unknown) => void }) {
  const [needRefresh, setNeedRefresh] = useState(pwaStub.needRefresh)
  const [offlineReady, setOfflineReady] = useState(pwaStub.offlineReady)
  void options
  return {
    needRefresh: [needRefresh, setNeedRefresh] as const,
    offlineReady: [offlineReady, setOfflineReady] as const,
    updateServiceWorker: async (reload?: boolean) => { pwaStub.updateCalls.push(Boolean(reload)) },
  }
}
