import { useEffect, useState, useMemo } from 'react'
import { getPosts, updatePost, getPost } from '../../api/marketing'
import Modal from '../../components/Modal'
import ActivityQuickModal from '../Marketing/ActivityQuickModal'
import CalendarWrapper from '../../components/marketing/CalendarWrapper'
import ActivityCreateFromCalendar from '../../components/marketing/ActivityCreateFromCalendar'
import NotificationBell from '../../components/NotificationBell'


export default function SalesMarketingActivities() {
    const [marketingTasks, setMarketingTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [showMarketingModal, setShowMarketingModal] = useState(false)
    const [selectedMarketingTask, setSelectedMarketingTask] = useState(null)
    const [showCreatePost, setShowCreatePost] = useState(false) // New state for create modal

    const user = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
    }, [])
    const myUserId = Number(user?.id || 0)

    const fetchTasks = async () => {
        setLoading(true)
        try {
            const mktRes = await getPosts({ assignedTo: myUserId })
            setMarketingTasks(mktRes.data?.data || [])
        } catch (e) {
            console.error("Failed to fetch marketing tasks", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [myUserId])

    const [view, setView] = useState('list') // 'list' | 'calendar'
    const [section, setSection] = useState('pipeline'); // 'pipeline' | 'published'
    const [currentDate, setCurrentDate] = useState(new Date())

    const calendarEvents = useMemo(() => {
        return marketingTasks.map(t => ({
            ...t,
            start: t.scheduledAt || '',
            originalId: t.id
        }))
    }, [marketingTasks])

    const handleEventDrop = async (eventId, newDate) => {
        try {
            await updatePost(eventId, { scheduledAt: newDate.toISOString() })
            fetchTasks()
        } catch (e) {
            console.error("Failed to reschedule", e)
        }
    }

    const getPlatformIcon = (platform) => {
        const p = (platform || '').toLowerCase()
        if (p.includes('instagram')) return '📸'
        if (p.includes('linkedin')) return '💼'
        if (p.includes('twitter') || p.includes('x')) return '🐦'
        if (p.includes('facebook')) return '👥'
        return '📢'
    }

    const getStatusBadge = (status) => {
        const styles = {
            'approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
            'posted': 'bg-slate-100 text-slate-600 border-slate-200',
            'draft': 'bg-amber-100 text-amber-700 border-amber-200',
        }
        return styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'
    }

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Marketing Activities</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage and execute your assigned marketing tasks.</p>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setView('calendar')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Calendar
                        </button>
                    </div>
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${loading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                            }`}
                    >
                        <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>↻</span>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => setShowCreatePost(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        <span>+</span> New Post
                    </button>
                </div>
            </div>

            {/* Section Tabs (Only relevant for List view, but good to have global context) */}
            <div className="flex items-center gap-6 border-b border-slate-200">
                <button
                    onClick={() => setSection('pipeline')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${section === 'pipeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Pipeline ({marketingTasks.filter(t => ['draft', 'for_review', 'scheduled', 'posted'].includes(t.status)).length})
                </button>
                <button
                    onClick={() => setSection('completed')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${section === 'completed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Completed ({marketingTasks.filter(t => ['approved'].includes(t.status)).length})
                </button>
            </div>

            {view === 'list' ? (
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr >
                                    <th className="px-6 py-4 font-semibold text-slate-700">Activity</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Platform</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Scheduled For</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">View Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                                ) : (() => {
                                    const filtered = marketingTasks.filter(t => {
                                        if (section === 'pipeline') return ['draft', 'for_review', 'scheduled', 'posted'].includes(t.status);
                                        return ['approved'].includes(t.status); // section === 'completed'
                                    });

                                    if (filtered.length === 0) return (
                                        <tr>
                                            <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">📝</div>
                                                    <p>No {section} marketing activities found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                    return filtered.map(task => (
                                        <tr key={task.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{task.title}</div>
                                                {task.campaign && <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">Camp: {task.campaign}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <span>{getPlatformIcon(task.platform)}</span>
                                                    <span className="capitalize">{task.platform}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">
                                                {task.scheduledAt ? new Date(task.scheduledAt).toLocaleString('en-IN', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : <span className="text-slate-400 italic">Unscheduled</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(task.status)} capitalize`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedMarketingTask(task);
                                                        setShowMarketingModal(true);
                                                    }}
                                                    className="ml-auto inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600 active:scale-95"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-slate-200 rounded text-slate-600">&larr;</button>
                            <h2 className="text-lg font-semibold w-40 text-center text-slate-800">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-slate-200 rounded text-slate-600">&rarr;</button>
                            <button onClick={() => setCurrentDate(new Date())} className="text-sm px-2 py-1 border rounded bg-white hover:bg-slate-50 ml-2">Today</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden p-4">
                        <CalendarWrapper
                            currentDate={currentDate}
                            events={calendarEvents}
                            view="month"
                            onEventDrop={handleEventDrop}
                            onEventClick={(ev) => {
                                setSelectedMarketingTask(ev);
                                setShowMarketingModal(true);
                            }}
                            renderEvent={(ev) => (
                                <div className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${(() => {
                                    if (ev.platform?.toLowerCase().includes('linkedin')) return 'bg-blue-50 text-blue-700 border-blue-100'
                                    if (ev.platform?.toLowerCase().includes('instagram')) return 'bg-pink-50 text-pink-700 border-pink-100'
                                    return 'bg-slate-100 text-slate-700 border-slate-200'
                                })()}`}>
                                    {ev.title}
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}

            {/* Modal Logic */}

            {/* Modal Logic */}

            {showMarketingModal && selectedMarketingTask && (
                <ActivityQuickModal
                    isOpen={showMarketingModal}
                    postId={selectedMarketingTask.id}
                    onClose={() => setShowMarketingModal(false)}
                    onUpdate={fetchTasks}
                />
            )}

            {showCreatePost && (
                <ActivityCreateFromCalendar
                    date={new Date()}
                    onClose={() => setShowCreatePost(false)}
                    onCreated={fetchTasks}
                />
            )}
        </div>

    );
}
