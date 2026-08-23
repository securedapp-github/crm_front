import React, { useEffect, useState } from 'react'
import { PartyPopper, Cake, Sparkles, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { fireConfetti } from '../utils/confetti'

const getInitials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '🎉'

export default function BirthdayModal({ isOpen, onClose, birthdayData, currentUser }) {
  const [cheeredMap, setCheeredMap] = useState({})

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fireConfetti({ particleCount: 50, spread: 60, origin: { x: 0.5, y: 0.5 } })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen || !birthdayData) return null

  const { isUserBirthday, teammates = [] } = birthdayData

  const handleWish = (teammate) => {
    fireConfetti({ particleCount: 35, spread: 50 })
    setCheeredMap(prev => ({ ...prev, [teammate.id]: true }))
    toast.success(`Birthday wish sent to ${teammate.name}! 🥳`, {
      description: 'Your celebration greeting has been shared.'
    })
  }

  const handleWishAll = () => {
    fireConfetti({ particleCount: 60, spread: 70 })
    const newMap = { ...cheeredMap }
    teammates.forEach(t => { newMap[t.id] = true })
    setCheeredMap(newMap)
    toast.success('Birthday wishes sent to all teammates! 🎉')
  }

  const allWished = teammates.length > 0 && teammates.every(t => cheeredMap[t.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/20 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-300/40 text-slate-800 transition-all">
        {/* Festive Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 sm:p-5">
          {/* Hero Banner for Logged-In User's Birthday */}
          {isUserBirthday && (
            <div className="mb-3.5 p-3.5 rounded-xl bg-gradient-to-br from-amber-50 via-rose-50/60 to-indigo-50/50 border border-amber-200/70 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center shadow-sm flex-shrink-0 animate-bounce">
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    Happy Birthday, {currentUser?.name || 'there'}! 🎂
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                    Wishing you an awesome year filled with success and joy! ✨
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Teammates List */}
          {teammates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <PartyPopper className="w-3.5 h-3.5 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800">
                    {isUserBirthday ? 'Teammates Celebrating' : "Today's Birthdays"}
                  </h4>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                    {teammates.length}
                  </span>
                </div>

                {teammates.length > 1 && !allWished && (
                  <button
                    onClick={handleWishAll}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Wish All 🎉
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                {teammates.map((teammate) => {
                  const isWished = cheeredMap[teammate.id]
                  return (
                    <div
                      key={teammate.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/70 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
                          {getInitials(teammate.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {teammate.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {teammate.designation || teammate.department || teammate.role || 'Team Member'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-2">
                        {isWished ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs animate-in zoom-in-95 duration-150">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Wished 🥳</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleWish(teammate)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-xs hover:scale-102 active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3 h-3 text-amber-200" />
                            <span>Wish 🎉</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Compact Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span>🎂</span>
              <span>CRM Celebrations</span>
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg shadow-xs transition-all active:scale-95"
            >
              Awesome, thanks! 🎉
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}




