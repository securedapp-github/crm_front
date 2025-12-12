import { useState, useEffect, useCallback } from 'react';
import { getCalendar, updatePost } from '../../api/marketing';
import CalendarWrapper from '../../components/marketing/CalendarWrapper';
import ActivityQuickModal from './ActivityQuickModal';
import ActivityCreateFromCalendar from '../../components/marketing/ActivityCreateFromCalendar';
import { useToast } from '../../components/ToastProvider';

export default function ActivitiesCalendar() {
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // View State
    const [view, setView] = useState('month'); // 'month' | 'week'

    // Selection
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [createDate, setCreateDate] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        platform: '',
        status: '',
        assignedTo: '',
        q: ''
    });

    const { show } = useToast();

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            // Fetch broad range to cover week crossing months
            const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
            const end = new Date(year, month + 2, 0).toISOString().slice(0, 10);

            const res = await getCalendar(start, end, filters);
            setEvents(res.data.data);
        } catch (err) {
            console.error(err);
            show('Failed to load calendar', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentDate, filters, show]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleEventDrop = async (eventId, newDate) => {
        // Optimistic Update
        const originalEvents = [...events];
        const updatedEvents = events.map(e => {
            if (e.id === eventId) {
                return { ...e, start: newDate.toISOString() }; // Update locally
            }
            return e;
        });
        setEvents(updatedEvents);

        try {
            const ev = events.find(e => e.id === eventId);
            // If recurring instance, we might need special handling (e.g. detach).
            // For MVP, if it's a virtual ID (contains 'recur'), we can't efficiently drag yet without detaching.
            if (eventId.toString().includes('recur')) {
                show('Cannot move recurring instance directly yet.', 'error');
                setEvents(originalEvents);
                return;
            }

            await updatePost(eventId, { scheduledAt: newDate.toISOString() });
            show('Event rescheduled', 'success');
            fetchEvents(); // Refresh to ensure backend state
        } catch (err) {
            show('Failed to reschedule', 'error');
            setEvents(originalEvents);
        }
    };

    const platformColors = {
        LinkedIn: 'bg-blue-100 text-blue-700 border-blue-200',
        Twitter: 'bg-sky-100 text-sky-700 border-sky-200',
        Instagram: 'bg-pink-100 text-pink-700 border-pink-200',
        Facebook: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        Email: 'bg-slate-100 text-slate-700 border-slate-200'
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Workspace Header used as Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-slate-200 rounded">
                        &larr;
                    </button>
                    <h2 className="text-lg font-semibold w-40 text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-slate-200 rounded">
                        &rarr;
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm px-2 py-1 border rounded bg-white hover:bg-slate-50">Today</button>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                        className="text-sm border rounded-md px-2 py-1 bg-white"
                    >
                        <option value="month">Month</option>
                        <option value="week">Week</option>
                    </select>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 ml-auto">
                    <input
                        placeholder="Search..."
                        className="text-sm border rounded-md px-2 py-1 w-32"
                        value={filters.q}
                        onChange={e => setFilters({ ...filters, q: e.target.value })}
                    />
                    <select
                        className="text-sm border rounded-md px-2 py-1 max-w-[100px]"
                        value={filters.platform}
                        onChange={e => setFilters({ ...filters, platform: e.target.value })}
                    >
                        <option value="">All Platforms</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Instagram">Instagram</option>
                    </select>
                    <select
                        className="text-sm border rounded-md px-2 py-1 max-w-[100px]"
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="approved">Approved</option>
                        <option value="posted">Posted</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
                <CalendarWrapper
                    currentDate={currentDate}
                    events={events}
                    view={view}
                    onDateClick={(date) => setCreateDate(date)}
                    onEventClick={(ev) => setSelectedEvent(ev)}
                    onEventDrop={handleEventDrop}
                    renderEvent={(ev, v) => (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${platformColors[ev.platform] || 'bg-gray-100 text-gray-700'} ${ev.isRecurringInstance ? 'opacity-80' : ''}`}>
                            {v === 'week' ? (
                                <span className="font-bold mr-1">{new Date(ev.start).getHours()}:00</span>
                            ) : null}
                            {ev.isRecurringInstance && <span className="mr-1">↻</span>}
                            {ev.title}
                        </div>
                    )}
                />
            </div>

            {selectedEvent && (
                <ActivityQuickModal
                    isOpen={!!selectedEvent}
                    onClose={() => { setSelectedEvent(null); fetchEvents(); }}
                    postId={selectedEvent.originalId || selectedEvent.id} // Handle virtual ID
                />
            )}

            {createDate && (
                <ActivityCreateFromCalendar
                    date={createDate}
                    onClose={() => setCreateDate(null)}
                    onCreated={fetchEvents}
                />
            )}
        </div>
    );
}
