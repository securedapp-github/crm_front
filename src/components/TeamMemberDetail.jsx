import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPipeline } from '../api/sales'
import { getTasks } from '../api/task'
import { getPeople } from '../api/sales'

export default function TeamMemberDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [deals, setDeals] = useState([])
    const [tasks, setTasks] = useState([])
    const [member, setMember] = useState(null)
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [pipeRes, taskRes, peopleRes] = await Promise.all([
                    getPipeline(),
                    getTasks(),
                    getPeople()
                ])

                // Find the team member
                const people = peopleRes.data?.data || []
                const foundMember = people.find(p => String(p.id) === id)
                setMember(foundMember)

                // Filter deals
                const allDeals = Object.values(pipeRes.data?.data || {}).flat()
                const memberDeals = allDeals.filter(d => String(d.assignedTo) === id)
                setDeals(memberDeals)

                // Filter tasks
                const allTasks = taskRes.data?.data || []
                const memberTasks = allTasks.filter(t => String(t.assignedTo) === String(foundMember?.userId || id)) // Task assignedTo might be userId
                setTasks(memberTasks)

            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const applyPreset = (preset) => {
        const now = new Date()
        const from = new Date()

        switch (preset) {
            case 'today':
                setFromDate(now.toISOString().split('T')[0])
                setToDate(now.toISOString().split('T')[0])
                break
            case 'yesterday':
                from.setDate(now.getDate() - 1)
                setFromDate(from.toISOString().split('T')[0])
                setToDate(from.toISOString().split('T')[0])
                break
            case '7d':
                from.setDate(now.getDate() - 7)
                setFromDate(from.toISOString().split('T')[0])
                setToDate(now.toISOString().split('T')[0])
                break
            default:
                break
        }
    }

    const filteredDeals = useMemo(() => {
        if (!fromDate && !toDate) return deals
        const start = fromDate ? new Date(fromDate) : new Date(0)
        const end = toDate ? new Date(toDate) : new Date()
        end.setHours(23, 59, 59, 999)

        return deals.filter(d => {
            const date = new Date(d.updatedAt || d.createdAt)
            return date >= start && date <= end
        })
    }, [deals, fromDate, toDate])

    const filteredTasks = useMemo(() => {
        if (!fromDate && !toDate) return tasks
        const start = fromDate ? new Date(fromDate) : new Date(0)
        const end = toDate ? new Date(toDate) : new Date()
        end.setHours(23, 59, 59, 999)

        return tasks.filter(t => {
            const date = new Date(t.dueDate || t.updatedAt || t.createdAt)
            return date >= start && date <= end
        })
    }, [tasks, fromDate, toDate])

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>
    if (!member) return <div className="p-8 text-center text-slate-500">Team member not found</div>

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="mb-2 text-sm text-slate-500 hover:text-indigo-600"
                        >
                            ← Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
                        <p className="text-slate-500">{member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex gap-1 pb-0.5">
                            <button onClick={() => applyPreset('today')} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">Today</button>
                            <button onClick={() => applyPreset('yesterday')} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">Yesterday</button>
                            <button onClick={() => applyPreset('7d')} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">7 Days</button>
                            {(fromDate || toDate) && (
                                <button onClick={() => { setFromDate(''); setToDate('') }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-100">Clear</button>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Deals Section */}
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Deals ({filteredDeals.length})</h2>
                        <div className="space-y-3">
                            {filteredDeals.length === 0 ? (
                                <p className="text-sm text-slate-500">No deals found for this period.</p>
                            ) : (
                                filteredDeals.map(deal => (
                                    <div key={deal.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-800">{deal.title}</span>
                                            <span className="text-xs font-medium text-indigo-600">{deal.stage}</span>
                                        </div>
                                        <div className="mt-1 flex justify-between text-xs text-slate-500">
                                            <span>₹{Number(deal.value).toLocaleString()}</span>
                                            <span>{new Date(deal.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Tasks Section */}
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tasks ({filteredTasks.length})</h2>
                        <div className="space-y-3">
                            {filteredTasks.length === 0 ? (
                                <p className="text-sm text-slate-500">No tasks found for this period.</p>
                            ) : (
                                filteredTasks.map(task => (
                                    <div key={task.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-800">{task.title}</span>
                                            <span className={`text-xs font-medium ${task.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                                        <div className="mt-2 text-xs text-slate-400">
                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
