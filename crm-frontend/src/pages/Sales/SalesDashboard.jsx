import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPipeline } from '../../api/sales'
import { getTasks, updateTask, createTask } from '../../api/task'
import Modal from '../../components/Modal'

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [tasks, setTasks] = useState([])
  const [scheduleDealId, setScheduleDealId] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState('')
  const [calendarTime, setCalendarTime] = useState('')
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])
  const myId = Number(user?.id || 0)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pipeRes, taskRes] = await Promise.all([getPipeline(), getTasks()])
      setData(pipeRes.data?.data || {})
      setTasks(taskRes.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const allDeals = useMemo(() => (Object.values(data || {}).flat() || []), [data])
  const myDeals = useMemo(() => (allDeals.filter(d => Number(d.assignedTo) === myId)), [allDeals, myId])

  const myTasks = useMemo(() => {
    const setDealIds = new Set(myDeals.map(d => d.id))
    return (tasks || []).filter(t => t.relatedDealId && setDealIds.has(t.relatedDealId))
  }, [tasks, myDeals])

  const upcoming = useMemo(() => {
    const now = new Date()
    return myTasks
      .filter(t => t.status === 'Open' && t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10)
  }, [myTasks])

  const dealTitle = (id) => myDeals.find(d => d.id === id)?.title || `Deal #${id}`

  const setStatus = async (task, status) => {
    try {
      await updateTask(task.id, { status })
      await fetchAll()
    } catch {}
  }

  const openCalendar = () => {
    if (!scheduleDealId) return
    const now = new Date()
    setCalendarDate(now.toISOString().slice(0, 10))
    setCalendarTime(now.toISOString().slice(11, 16))
    setCalendarOpen(true)
  }

  const scheduleFollowUpQuick = async (days) => {
    const idNum = Number(scheduleDealId)
    if (!idNum) return
    const due = new Date()
    due.setDate(due.getDate() + Number(days || 0))
    await createFollowUpTask(idNum, due, `Scheduled from Quick picker (+${days}d)`) // eslint-disable-line no-use-before-define
  }

  const createFollowUpTask = async (dealId, dueDateObj, description) => {
    try {
      await createTask({
        title: 'Follow-up Call',
        description,
        status: 'Open',
        assignedTo: myId || null,
        relatedDealId: dealId,
        dueDate: dueDateObj.toISOString()
      })
      setScheduleDealId('')
      await fetchAll()
    } catch {}
  }

  const onCalendarSubmit = async () => {
    if (!scheduleDealId || !calendarDate) return
    const datePart = calendarDate
    const timePart = calendarTime || '09:00'
    const due = new Date(`${datePart}T${timePart}:00`)
    if (Number.isNaN(due.getTime())) {
      return
    }
    await createFollowUpTask(Number(scheduleDealId), due, 'Scheduled from Sales Dashboard calendar')
    setCalendarOpen(false)
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Sales Dashboard</h2>
        <button onClick={fetchAll} disabled={loading} className={`px-4 py-2 rounded-lg text-sm ${loading?'bg-slate-100 text-slate-400':'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{loading?'Refreshing...':'Refresh Data'}</button>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Quick Schedule</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select
                className="min-w-[240px] rounded-md border px-3 py-2 text-sm"
                value={scheduleDealId}
                onChange={(e)=>setScheduleDealId(e.target.value)}
              >
                <option value="">Select your deal…</option>
                {myDeals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <button disabled={!scheduleDealId} onClick={()=>scheduleFollowUpQuick(1)} className={`rounded-md px-3 py-2 text-sm text-white ${scheduleDealId? 'bg-emerald-600 hover:bg-emerald-700':'bg-emerald-300 cursor-not-allowed'}`}>Tomorrow</button>
              <button disabled={!scheduleDealId} onClick={()=>scheduleFollowUpQuick(2)} className={`rounded-md px-3 py-2 text-sm text-white ${scheduleDealId? 'bg-emerald-600 hover:bg-emerald-700':'bg-emerald-300 cursor-not-allowed'}`}>In 2 days</button>
              <button disabled={!scheduleDealId} onClick={()=>scheduleFollowUpQuick(7)} className={`rounded-md px-3 py-2 text-sm text-white ${scheduleDealId? 'bg-emerald-600 hover:bg-emerald-700':'bg-emerald-300 cursor-not-allowed'}`}>In 1 week</button>
              <button disabled={!scheduleDealId} onClick={openCalendar} className={`rounded-md px-3 py-2 text-sm font-medium ${scheduleDealId? 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50':'border border-emerald-200 text-emerald-300 cursor-not-allowed'}`}>Pick date &amp; time…</button>
            </div>
          </div>
          <div className="text-sm text-slate-600">Logged in as <span className="font-medium">{user?.name || 'Sales Person'}</span></div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assigned Leads */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Assigned Leads</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Stage</th>
                  <th className="text-left px-3 py-2">Value</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myDeals.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>No deals assigned to you yet. Please add leads to get started.</td></tr>
                ) : myDeals.map(d => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-slate-900">{d.title}</td>
                    <td className="px-3 py-2 text-slate-700">{d.pipelineStage || d.stage || 'New'}</td>
                    <td className="px-3 py-2 text-slate-700">₹{Number(d.value||0).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <Link to={`/dashboard/sales/deals/${d.id}`} className="text-indigo-600 hover:underline text-xs">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact Schedule */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Contact Schedule</h3>
          <div className="mt-3 max-h-80 overflow-y-auto rounded border">
            {upcoming.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-600">No upcoming contacts</div>
            ) : (
              <ul className="divide-y">
                {upcoming.map(t => (
                  <li key={t.id} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{dealTitle(t.relatedDealId)}</div>
                        <div className="text-xs text-slate-600">{new Date(t.dueDate).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setStatus(t,'In Progress')} className="rounded-md border px-2 py-1 text-xs text-amber-700 border-amber-200 hover:bg-amber-50">Scheduled</button>
                        <button onClick={()=>setStatus(t,'Resolved')} className="rounded-md border px-2 py-1 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">Completed</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Schedule follow-up"
        actions={(
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarOpen(false)} className="rounded-md border px-3 py-2">Cancel</button>
            <button onClick={onCalendarSubmit} className="rounded-md bg-emerald-600 px-4 py-2 text-white">Save</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={calendarDate}
              onChange={(e)=>setCalendarDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
            <input
              type="time"
              className="w-full rounded-md border px-3 py-2"
              value={calendarTime}
              onChange={(e)=>setCalendarTime(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">This follow-up will appear for admins under Upcoming Sales Calls.</p>
        </div>
      </Modal>
    </div>
  )
}
