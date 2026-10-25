import { useEffect, useState } from 'react'
import { create } from 'zustand'

/** Panneau latéral ouvert en tiroir sur petit écran (mobile, tablette). */
export const useDrawer = create<{ open: 'left' | 'right' | null; set: (o: 'left' | 'right' | null) => void }>((set) => ({
  open: null,
  set: (open) => set({ open }),
}))

/** Vrai sous 1100 px de large : panneaux latéraux en tiroirs, commandes compactes. */
export function useCompact() {
  const q = '(max-width: 1099px)'
  const [c, setC] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setC(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return c
}
