import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPeople, getPipeline, markDealDone, moveDealStage, deleteDeal, getDeletedDeals } from '../../api/sales'
import { getTasks } from '../../api/task'
import { getAllSalespeople, offboardSalesperson, downloadSalespersonReportCSV } from '../../api/user'
import Modal from '../../components/Modal'

const STAGES = ['New', 'In Progress', 'Proposal', 'Deal Completed', 'Lost Opportunity']

export default function Pipeline() {
  const [loading, setLoading] = useState(true)
  const [salespeople, setSalespeople] = useState([])
  const [data, setData] = useState(() => STAGES.reduce((acc, s) => ({ ...acc, [s]: [] }), {}))
  const [tasks, setTasks] = useState([])
  const [deletedCount, setDeletedCount] = useState(0)

  // Offboarding state
  const [offboardModalOpen, setOffboardModalOpen] = useState(false)
  const [allSalesUsers, setAllSalesUsers] = useState([])
  const [selectedOffboardUser, setSelectedOffboardUser] = useState('')
  const [offboarding, setOffboarding] = useState(false)
  const [offboardResult, setOffboardResult] = useState(null)

  // Report download state
  const [selectedReportSP, setSelectedReportSP] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Check if user is admin
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])
  const isAdmin = user?.role === 'admin'

  // Notes visibility state - object mapping salesperson ID to visibility
  const [notesOpen, setNotesOpen] = useState({})

  const fetchAll = async () => {
    setLoading(true)
    try {
      const promises = [getPeople(), getPipeline(), getTasks(), getDeletedDeals()]
      if (isAdmin) promises.push(getAllSalespeople())

      const results = await Promise.all(promises)
      const [peopleRes, pipeRes, tasksRes, deletedRes, salesUsersRes] = results

      const rawPeople = Array.isArray(peopleRes.data?.data) ? peopleRes.data.data : []
      const filteredPeople = rawPeople.filter(sp => !/@example\.com$/i.test(sp?.email || ''))
      setSalespeople(filteredPeople)
      setData(pipeRes.data?.data || {})
      setTasks(tasksRes.data?.data || [])
      setDeletedCount(deletedRes?.data?.data?.length || 0)

      if (salesUsersRes) {
        // CRITICAL: Store ALL users (both active and inactive) to properly filter
        const allUsers = salesUsersRes.data?.data || [];
        setAllSalesUsers(allUsers);
        console.log('Loaded sales users:', allUsers);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleOffboard = async () => {
    if (!selectedOffboardUser) return
    setOffboarding(true)
    try {
      const res = await offboardSalesperson(selectedOffboardUser)
      setOffboardResult(res.data)
      await fetchAll()
      setTimeout(() => {
        setOffboardModalOpen(false)
        setSelectedOffboardUser('')
        setOffboardResult(null)
      }, 3000)
    } catch (err) {
      alert('Failed to offboard salesperson')
    } finally {
      setOffboarding(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!selectedReportSP) return
    setDownloading(true)
    try {
      const response = await downloadSalespersonReportCSV(selectedReportSP)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const spName = salespeople.find(sp => sp.id === Number(selectedReportSP))?.name || 'salesperson'
      link.setAttribute('download', `sales-report-${spName.replace(/[^a-z0-9]/gi, '_')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to download report')
    } finally {
      setDownloading(false)
    }
  }

  const handleCloseDeal = async (dealId) => {
    try {
      await moveDealStage(dealId, 'In Progress')
      await fetchAll()
    } catch (err) {
      console.error('Failed to move deal back to In Progress', err)
    }
  }

  const handleMarkDone = async (dealId) => {
    try {
      await markDealDone(dealId)
      await fetchAll()
    } catch (err) {
      console.error('Failed to mark deal completed', err)
    }
  }

  const handleDeleteDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to delete this deal? It will be moved to Deleted Deals.')) return
    try {
      await deleteDeal(dealId)
      await fetchAll()
    } catch (err) {
      console.error('Failed to delete deal', err)
      alert('Failed to delete deal')
    }
  }

  const initials = (name) =>
    (name || '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SP'

  const totals = useMemo(
    () =>
      STAGES.map((s) => ({
        stage: s,
        count: (data[s] || []).length,
        amount: (data[s] || []).reduce((sum, d) => sum + Number(d.value || 0), 0),
      })),
    [data]
  )

  const allDeals = useMemo(() => (Object.values(data || {}).flat() || []), [data])
  const newStageDeals = useMemo(() => (data['New'] || []), [data])
  const upcomingCalls = useMemo(() => {
    const now = new Date()
    const list = (tasks || [])
      .filter(t => t.status === 'Open' && t.relatedDealId && t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 8)
    const withDeal = list.map(t => ({
      task: t,
      deal: allDeals.find(d => d.id === t.relatedDealId) || null
    }))
    return withDeal
  }, [tasks, allDeals])

  const perSalesperson = useMemo(() => {
    // Filter to only show active salespeople in main view
    const activeSalespeople = salespeople.filter(sp => {
      // Check if this salesperson has an active user account
      const userRecord = allSalesUsers.find(u => u.email === sp.email);
      const isActive = !userRecord || userRecord.isActive !== false;
      console.log(`Salesperson ${sp.name} (${sp.email}): userRecord=`, userRecord, 'isActive=', isActive);
      return isActive;
    });

    console.log('Total salespeople:', salespeople.length, 'Active:', activeSalespeople.length);

    return activeSalespeople.map(sp => {
      const byStage = STAGES.map(stage => {
        const items = (data[stage] || []).filter(d => d.assignedTo === sp.id)
        const amount = items.reduce((sum, d) => sum + Number(d.value || 0), 0)
        const notes = items.filter(d => d.notes)
        return { stage, items, amount, notes }
      })
      const stageNotes = byStage
        .filter(col => col.notes.length > 0)
        .flatMap(col => col.notes.map(deal => ({ stage: col.stage, deal })))
      return { sp, byStage, stageNotes }
    })
  }, [salespeople, data, allSalesUsers])

  // Get inactive/offboarded salespeople
  const offboardedSalespeople = useMemo(() => {
    if (!isAdmin || !allSalesUsers.length) return [];

    return salespeople.filter(sp => {
      const userRecord = allSalesUsers.find(u => u.email === sp.email);
      return userRecord && userRecord.isActive === false;
    }).map(sp => {
      const byStage = STAGES.map(stage => {
        const items = (data[stage] || []).filter(d => d.assignedTo === sp.id)
        const amount = items.reduce((sum, d) => sum + Number(d.value || 0), 0)
        return { stage, items, amount }
      })
      return { sp, byStage }
    });
  }, [salespeople, data, allSalesUsers, isAdmin])

  const [showOffboarded, setShowOffboarded] = useState(false)

  return (
    <div className="space-y-6 p-4">
      <Link
        to="/dashboard/sales-team"
        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start mb-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>Back </span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-slate-900">Sales Pipeline</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`px-4 py-2 rounded-lg border text-sm transition ${loading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            onClick={fetchAll}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>

          {isAdmin && (
            <>
              {/* Report Download */}
              <div className="flex items-center gap-2">
                <select
                  className="px-3 py-2 border rounded-lg text-sm"
                  value={selectedReportSP}
                  onChange={(e) => setSelectedReportSP(e.target.value)}
                >
                  <option value="">Select salesperson</option>
                  {salespeople.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDownloadReport}
                  disabled={!selectedReportSP || downloading}
                  className={`px-4 py-2 rounded-lg text-sm ${!selectedReportSP || downloading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  {downloading ? 'Downloading...' : 'Download Report'}
                </button>
              </div>

              {/* Offboard Button */}
              <button
                onClick={() => setOffboardModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm"
              >
                Offboard Salesperson
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upcoming calls overview */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <h3 className="text-base font-semibold text-slate-900">Upcoming Sales Calls</h3>
          <div className="w-full md:w-[420px]">
            <div className="max-h-40 overflow-y-auto rounded-lg border bg-white">
              {upcomingCalls.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-600">No upcoming call tasks</div>
              ) : (
                <ul className="divide-y">
                  {upcomingCalls.map(({ task, deal }) => {
                    const sp = salespeople.find(p => p.id === (deal?.assignedTo || 0))
                    const spName = sp?.userName || sp?.name || '—'
                    return (
                      <li key={task.id} className="px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-900 truncate">{deal?.title || `Deal #${task.relatedDealId}`}</div>
                          <div className="text-xs text-slate-600">{new Date(task.dueDate).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-slate-600">{task.title}</div>
                        <div className="text-[11px] text-slate-500">Salesperson: {spName}</div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Totals header */}
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <div className="min-w-[800px] grid grid-cols-6 gap-0 text-sm">
          <div className="col-span-1 px-4 py-3 border-r font-medium text-slate-700">Salesperson</div>
          {STAGES.map(s => {
            const t = totals.find(t => t.stage === s)
            return (
              <div key={s} className="px-4 py-3 border-r last:border-r-0 text-slate-700 flex items-center justify-between">
                <span>{s}</span>
                <span className="text-xs text-slate-500">{t?.count || 0} • ₹{Number(t?.amount || 0).toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rows per salesperson with stage columns */}
      <div className="space-y-4">
        {perSalesperson.map(row => (
          <div key={row.sp.id} className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <div className="min-w-[800px] grid grid-cols-6 gap-0">
              <div className="col-span-1 px-4 py-3 border-r flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {initials(row.sp.name)}
                </span>
                <div className="text-slate-900 font-medium truncate">{row.sp.name}</div>
              </div>
              {row.byStage.map(col => (
                <div
                  key={col.stage}
                  className="px-3 py-3 border-r last:border-r-0 bg-slate-50/30"
                >
                  <div className="min-h-[84px] space-y-2">
                    {col.items.map(deal => {
                      const friendlyTitle = (() => {
                        const t = typeof deal.title === 'string' ? deal.title : ''
                        const pattern = /^Campaign Lead\s*-\s*(.+?)(?:\s*Opportunity)?$/i
                        const match = t.match(pattern)
                        const cleaned = match && match[1] ? match[1].trim() : t
                        return cleaned
                      })()
                      return (
                        <div
                          key={deal.id}
                          className="rounded-lg border bg-white px-3 py-2 transition-all"
                          title={friendlyTitle}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-900 text-sm truncate">{friendlyTitle}</div>
                            <div className="text-xs text-slate-600">₹{Number(deal.value || 0).toLocaleString()}</div>
                          </div>

                          {/* Display activity timestamps */}
                          {(deal.startedAt || deal.closedAt || deal.lostAt) && (
                            <div className="mt-1 space-y-0.5">
                              {deal.startedAt && (
                                <div className="text-[10px] text-slate-500">
                                  ⏱️ Started: {new Date(deal.startedAt).toLocaleString()}
                                </div>
                              )}
                              {deal.closedAt && (
                                <div className="text-[10px] text-emerald-600">
                                  ✅ Closed: {new Date(deal.closedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}

                          {col.stage === 'Deal Completed' && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <button
                                onClick={() => handleCloseDeal(deal.id)}
                                className="rounded border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleMarkDone(deal.id)}
                                className="rounded border border-emerald-300 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
                              >
                                Done
                              </button>
                            </div>
                          )}

                          {col.stage === 'Lost Opportunity' && isAdmin && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <button
                                onClick={() => handleCloseDeal(deal.id)}
                                className="rounded border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteDeal(deal.id)}
                                className="rounded border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {col.items.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-5 italic">No deals</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {row.stageNotes.length > 0 && (
              <div className="border-t bg-slate-50/50">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for {row.sp.name}</div>
                  <button
                    onClick={() => setNotesOpen(prev => ({ ...prev, [row.sp.id]: !prev[row.sp.id] }))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    {notesOpen[row.sp.id] ? (
                      <>
                        <span>Hide</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                {notesOpen[row.sp.id] && (
                  <div className="px-4 pb-4 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:col-span-2 lg:col-span-3">
                        <ul className="space-y-2 text-xs text-slate-600">
                          {row.stageNotes.map(({ stage, deal }) => (
                            <li key={`${stage}-${deal.id}`} className="rounded-md border border-slate-100 bg-slate-50/60 p-2">
                              <div className="font-medium text-slate-700 truncate">{deal.title || `Deal #${deal.id}`}</div>
                              <p className="mt-1 text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
                              {deal.updatedAt && (
                                <span className="mt-1 block text-[10px] text-slate-400">Updated {new Date(deal.updatedAt).toLocaleString()}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Offboarded Salespeople Section */}
      {isAdmin && offboardedSalespeople.length > 0 && (
        <div className="mt-8 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Offboarded Salespeople</h3>
              <p className="text-xs text-slate-500 mt-0.5">{offboardedSalespeople.length} inactive salesperson(s)</p>
            </div>
            <button
              onClick={() => setShowOffboarded(!showOffboarded)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              {showOffboarded ? (
                <>
                  <span>Hide</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Show</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {showOffboarded && (
            <div className="p-4 space-y-4">
              {offboardedSalespeople.map(row => (
                <div key={row.sp.id} className="rounded-lg border bg-slate-50/50">
                  <div className="grid grid-cols-6 gap-0">
                    <div className="col-span-1 px-4 py-3 border-r flex items-center gap-3 bg-slate-100">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-slate-600 border border-slate-400">
                        {initials(row.sp.name)}
                      </span>
                      <div>
                        <div className="text-slate-700 font-medium truncate">{row.sp.name}</div>
                        <div className="text-xs text-slate-500">Inactive</div>
                      </div>
                    </div>
                    {row.byStage.map(col => (
                      <div
                        key={col.stage}
                        className="px-3 py-3 border-r last:border-r-0 bg-slate-50/30"
                      >
                        <div className="min-h-[60px]">
                          {col.items.length > 0 ? (
                            <div className="text-xs text-slate-500">
                              {col.items.length} deal(s) • ₹{Number(col.amount || 0).toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">No deals</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offboarding Modal */}
      {isAdmin && (
        <Modal
          open={offboardModalOpen}
          onClose={() => {
            if (!offboarding) {
              setOffboardModalOpen(false)
              setSelectedOffboardUser('')
              setOffboardResult(null)
            }
          }}
          title="Offboard Salesperson"
          actions={
            !offboardResult ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setOffboardModalOpen(false)
                    setSelectedOffboardUser('')
                  }}
                  disabled={offboarding}
                  className="px-4 py-2 border rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOffboard}
                  disabled={!selectedOffboardUser || offboarding}
                  className={`px-4 py-2 rounded-md text-sm text-white ${!selectedOffboardUser || offboarding
                    ? 'bg-rose-300 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                >
                  {offboarding ? 'Offboarding...' : 'Confirm Offboard'}
                </button>
              </div>
            ) : null
          }
        >
          {!offboardResult ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ <strong>Warning:</strong> This will deactivate the salesperson's account and reassign all their pending deals.
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Salesperson to Offboard
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedOffboardUser}
                  onChange={(e) => setSelectedOffboardUser(e.target.value)}
                  disabled={offboarding}
                >
                  <option value="">-- Select --</option>
                  {allSalesUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="text-emerald-800 font-semibold">✅ {offboardResult.message}</div>
                <div className="mt-2 text-sm text-emerald-700">
                  <p><strong>Deactivated:</strong> {offboardResult.deactivated?.userName}</p>
                  <p><strong>Deals Reassigned:</strong> {offboardResult.dealsReassigned}</p>
                </div>
              </div>

              {offboardResult.reassignments && offboardResult.reassignments.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Reassignments</div>
                  <ul className="space-y-1 text-sm">
                    {offboardResult.reassignments.map((r, i) => (
                      <li key={i} className="text-slate-700">
                        <span className="font-medium">{r.dealTitle}</span> → {r.newSalesperson}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
