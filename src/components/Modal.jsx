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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative mx-auto flex w-full max-w-[96vw] sm:max-w-3xl lg:max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[92vh] animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-full hover:bg-slate-200 transition-all duration-200 text-slate-600 hover:text-slate-900 text-xl font-light flex-shrink-0"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>
        {actions && (
          <div className="flex items-center justify-end gap-2 sm:gap-3 border-t border-slate-200 px-4 sm:px-6 py-4 bg-slate-50/50 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
