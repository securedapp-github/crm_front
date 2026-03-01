import React, { useState, useEffect, useCallback } from 'react';
import InboxList from '../../components/TeamInbox/InboxList';
import MessageView from '../../components/TeamInbox/MessageView';
import teamInboxApi from '../../api/teamInbox';
import { getAllSalespeople } from '../../api/user';
import { getMe } from '../../api/auth';
import { useToast } from '../../components/ToastProvider';

const TeamInbox = () => {
    const [messages, setMessages] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        search: ''
    });
    const { show } = useToast();

    const fetchMessages = useCallback(async () => {
        try {
            const res = await teamInboxApi.getMessages(filters);
            // Handle direct array response from new backend
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (err) {

            console.error('Failed to fetch messages', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchDetails = useCallback(async (id) => {
        try {
            const res = await teamInboxApi.getMessage(id);
            setSelectedMessage(res.data);

            // Set viewing
            await teamInboxApi.setViewingStatus(id, true);
        } catch (err) {
            console.error('Failed to fetch message details', err);
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        try {
            const [usersRes, meRes] = await Promise.all([
                getAllSalespeople(),
                getMe()
            ]);
            setUsers(usersRes.data.data || []);
            setCurrentUser(meRes.data.user);
        } catch (err) {
            console.error('Failed to fetch initial data', err);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        if (selectedId) {
            fetchDetails(selectedId);
        } else {
            setSelectedMessage(null);
        }

        return () => {
            if (selectedId) {
                teamInboxApi.setViewingStatus(selectedId, false).catch(console.error);
            }
        };
    }, [selectedId, fetchDetails]);

    const handleReply = async (body, files, callback) => {
        setReplying(true);
        try {
            await teamInboxApi.sendReply(selectedId, body, currentUser?.id, files);

            show('Reply sent successfully', 'success');
            callback();
            fetchDetails(selectedId);
            fetchMessages();
        } catch (err) {
            show('Failed to send reply', 'error');
        } finally {
            setReplying(false);
        }
    };

    const handleAssign = async (userId) => {
        try {
            await teamInboxApi.assignMessage(selectedId, userId);
            show('Message assigned successfully', 'success');
            fetchDetails(selectedId);
            fetchMessages();
        } catch (err) {
            show('Failed to assign message', 'error');
        }
    };

    const handleStatusChange = async (status) => {
        try {
            await teamInboxApi.updateMessageStatus(selectedId, status);
            show('Status updated successfully', 'success');
            fetchDetails(selectedId);
            fetchMessages();
        } catch (err) {
            show('Failed to update status', 'error');
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
            {/* Left Sidebar: Filter & List */}
            <div className="flex w-1/3 flex-col border-r border-slate-200 lg:w-1/4">
                <div className="border-b border-slate-100 p-4 bg-slate-50/50">
                    <div className="mb-4 flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-600 rounded-lg text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </span>
                            Team Inbox
                        </h1>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                            {messages.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full rounded-xl border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all shadow-sm"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
                            {['', 'NEW', 'ASSIGNED', 'ACTIVE', 'RESOLVED'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilters(prev => ({ ...prev, status: s }))}
                                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${filters.status === s
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {s === '' ? 'All' : (s === 'ACTIVE' ? 'Replied' : (s === 'RESOLVED' ? 'Closed' : s.charAt(0) + s.slice(1).toLowerCase()))}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <InboxList
                        messages={messages}
                        loading={loading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                </div>
            </div>

            {/* Main Content: Message View */}
            <div className="flex-1">
                <MessageView
                    message={selectedMessage}
                    onReply={handleReply}
                    onAssign={handleAssign}
                    onStatusChange={handleStatusChange}
                    users={users}
                    currentUser={currentUser}
                    replying={replying}
                />
            </div>
        </div>
    );
};

export default TeamInbox;
