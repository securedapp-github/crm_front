import { createContext, useCallback, useContext, useMemo, useState } from 'react'

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
      <div className="fixed top-16 right-4 z-[1000] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md border px-4 py-2 shadow-sm text-sm ${
            t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
