import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const InboxList = ({ messages, selectedId, onSelect, loading }) => {
    if (loading && messages.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-slate-500">
                No messages found
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Assigned': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Replied': return 'bg-green-100 text-green-700 border-green-200';
            case 'Closed': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="flex h-full flex-col divide-y divide-slate-100 overflow-y-auto">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    onClick={() => onSelect(msg.id)}
                    className={`cursor-pointer p-4 transition-colors hover:bg-slate-50 ${selectedId === msg.id ? 'bg-indigo-50/50' : ''
                        }`}
                >
                    <div className="mb-1 flex items-start justify-between">
                        <span className="truncate font-semibold text-slate-900">
                            {msg.customer_name || msg.customer_email}
                        </span>
                        <span className="text-xs text-slate-400">
                            {dayjs(msg.created_at).fromNow()}
                        </span>

                    </div>
                    <div className="mb-2 truncate text-sm font-medium text-slate-700">
                        {msg.subject || '(No Subject)'}
                    </div>
                    <div className="mb-3 line-clamp-1 text-xs text-slate-500">
                        {msg.body}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(msg.status)}`}>
                            {msg.status}
                        </span>
                        {msg.assignedAgent && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">Assigned to</span>
                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                                    {msg.assignedAgent.name}
                                </span>
                            </div>
                        )}

                    </div>
                </div>
            ))}
        </div>
    );
};

export default InboxList;
