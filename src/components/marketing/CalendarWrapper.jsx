import { useState, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function CalendarWrapper({
    currentDate,
    events,
    view = 'month', // 'month' | 'week'
    onDateClick,
    onEventClick,
    onEventDrop,
    renderEvent
}) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // --- MONTH VIEW LOGIC ---
    const daysGrid = useMemo(() => {
        const days = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();

        for (let i = 0; i < startPadding; i++) {
            const d = new Date(year, month, 1);
            d.setDate(d.getDate() - (startPadding - i));
            days.push({ date: d, isCurrentMonth: false });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: d, isCurrentMonth: false });
        }
        return days;
    }, [year, month]);

    // --- WEEK VIEW LOGIC ---
    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day; // Adjust so week starts on Sunday
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentDate]);

    // Drag Handlers
    const onDragStart = (e, eventId) => {
        e.dataTransfer.setData('eventId', eventId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const onDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const onDrop = (e, dateStr, hour = null) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('eventId');
        if (onEventDrop && eventId) {
            // If dropping on week view, we might have hour
            let targetDate = new Date(dateStr);
            if (hour !== null) targetDate.setHours(hour, 0, 0, 0);
            else targetDate.setHours(10, 0, 0, 0); // Default for month view

            onEventDrop(eventId, targetDate);
        }
    };


    // --- RENDERERS ---

    if (view === 'week') {
        return (
            <div className="flex flex-col h-full border rounded-lg bg-white overflow-hidden text-xs">
                {/* Header */}
                <div className="grid grid-cols-8 border-b divide-x bg-slate-50">
                    <div className="p-2 text-center text-slate-400 font-medium">Time</div>
                    {weekDays.map(d => (
                        <div key={d.toISOString()} className={`p-2 text-center ${d.toDateString() === new Date().toDateString() ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                            <div className="font-bold">{DAYS[d.getDay()]}</div>
                            <div>{d.getDate()}</div>
                        </div>
                    ))}
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {HOURS.map(hour => (
                        <div key={hour} className="grid grid-cols-8 divide-x border-b min-h-[60px]">
                            <div className="p-2 text-center text-slate-400 relative">
                                <span className="-top-3 relative text-[10px]">{hour}:00</span>
                            </div>
                            {weekDays.map(day => {
                                const dateStr = day.toISOString().slice(0, 10);
                                // Find events for this day + hour
                                const cellEvents = events.filter(e => {
                                    const eDate = new Date(e.start);
                                    return eDate.getDate() === day.getDate() &&
                                        eDate.getMonth() === day.getMonth() &&
                                        eDate.getHours() === hour;
                                });

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className="relative group transition-colors hover:bg-slate-50"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, dateStr, hour)}
                                        onClick={() => onDateClick && onDateClick(new Date(dateStr + `T${hour.toString().padStart(2, '0')}:00:00`))}
                                    >
                                        <div className="absolute inset-1 space-y-1">
                                            {cellEvents.map(ev => (
                                                <div
                                                    key={ev.id}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, ev.id)}
                                                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                                    className="cursor-pointer"
                                                >
                                                    {renderEvent ? renderEvent(ev, 'week') : (
                                                        <div className="bg-indigo-100 text-indigo-700 p-1 rounded text-[10px] truncate">
                                                            {ev.title}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Month View Default
    return (
        <div className="flex-1 border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-slate-50 border-b">
                {DAYS.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y">
                {daysGrid.map((dayObj, idx) => {
                    const dateStr = dayObj.date.toISOString().slice(0, 10);
                    const dayEvents = events.filter(e => e.start?.startsWith(dateStr));

                    return (
                        <div
                            key={idx}
                            className={`min-h-[100px] p-1 sm:p-2 transition-colors relative flex flex-col gap-1 ${dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'}`}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, dateStr)}
                            onClick={() => onDateClick && onDateClick(dayObj.date)}
                        >
                            <div className="flex justify-between items-start">
                                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${dateStr === new Date().toISOString().slice(0, 10)
                                        ? 'bg-indigo-600 text-white'
                                        : ''
                                    }`}>
                                    {dayObj.date.getDate()}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 overflow-hidden">
                                {dayEvents.slice(0, 4).map(ev => (
                                    <div
                                        key={ev.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, ev.id)}
                                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                        className="cursor-pointer"
                                    >
                                        {renderEvent ? renderEvent(ev, 'month') : (
                                            <div className="bg-indigo-100 text-indigo-700 px-1 rounded text-[10px] truncate">
                                                {ev.title}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {dayEvents.length > 4 && (
                                    <div className="text-[10px] text-slate-400 pl-1">
                                        +{dayEvents.length - 4} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
