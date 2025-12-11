import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, actions }) {
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

  if (!open) return null

  return (
    <div className="relative z-50" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden p-4 sm:p-6">
        <div className="relative flex max-h-[90vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:max-w-3xl lg:max-w-4xl animate-scale-in">
          {/* Header */}
          <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h3>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-xl font-light text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900 sm:h-10 sm:w-10"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>

          {/* Footer */}
          {actions && (
            <div className="flex flex-none items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
