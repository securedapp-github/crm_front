import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastCtx = createContext({ show: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const show = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((ts) => [...ts, { id, message, type }])
    setTimeout(() => remove(id), 3000)
  }, [remove])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed top-16 right-4 z-[100000] space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className={`pointer-events-auto rounded-xl border px-4 py-2.5 shadow-lg text-xs font-semibold animate-fade-in ${
              t.type === 'success' ? 'bg-emerald-600 border-emerald-700 text-white' :
              t.type === 'error' ? 'bg-rose-600 border-rose-700 text-white' :
              'bg-slate-900 border-slate-800 text-white'
            }`}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
