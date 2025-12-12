import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, actions }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="relative z-[9999]" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden p-4 sm:p-6">
        <div className="relative flex max-h-[90vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:max-w-3xl lg:max-w-4xl animate-scale-in border border-slate-100/50">
          {/* Header */}
          <div className="flex flex-none items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="text-lg font-bold text-slate-800 sm:text-xl">{title}</h3>
            <button
              onClick={onClose}
              className="group grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 sm:h-9 sm:w-9"
              aria-label="Close modal"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 bg-slate-50/30">
            {children}
          </div>

          {/* Footer */}
          {actions && (
            <div className="flex flex-none items-center justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
