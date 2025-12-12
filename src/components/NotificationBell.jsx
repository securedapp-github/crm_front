import { useState, useEffect, useRef } from 'react';
import { api } from '../api/auth';
import { useToast } from './ToastProvider';
import ActivityQuickModal from '../pages/Marketing/ActivityQuickModal';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const { show } = useToast();
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markRead = async (id, postdId = null) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (postdId) setSelectedPostId(postdId);
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/all/read');
            setNotifications([]);
        } catch (err) {
            show('Failed to clear notifications', 'error');
        }
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-100"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No new notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markRead(notification.id, notification.resourceId)}
                                        className="cursor-pointer px-4 py-3 hover:bg-slate-50 transition-colors"
                                    >
                                        <p className="text-sm text-slate-600 line-clamp-2">{notification.message}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for viewing post details when notification is clicked */}
            {selectedPostId && (
                <div className="fixed inset-0 z-[60]" onClick={(e) => e.stopPropagation()}>
                    {/* z-60 to be above the dropdown z-50 */}
                    <ActivityQuickModal
                        isOpen={true}
                        postId={selectedPostId}
                        onClose={() => setSelectedPostId(null)}
                        onUpdate={() => {
                            // Optional: refresh notifications if something changed that triggers another notif (unlikely for self)
                        }}
                    />
                </div>
            )}
        </div>
    );
}
