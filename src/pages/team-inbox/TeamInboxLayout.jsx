import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ThreadList from '../../components/team-inbox/ThreadList';
import ConversationView from '../../components/team-inbox/ConversationView';
import { api } from '../../api/auth';
import './team-inbox.css';

const TeamInboxLayout = () => {
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState(null);

    const [searchParams] = useSearchParams();
    const leadIdParam = searchParams.get('lead_id');

    const fetchThreadsApi = async () => {
        try {
            const res = await api.get('/team-inbox/threads');
            if (res.data.success) {
                setThreads(res.data.data);
                if (leadIdParam) {
                    const target = res.data.data.find(t => String(t.lead_id) === String(leadIdParam) || String(t.lead?.id) === String(leadIdParam));
                    if (target) setActiveThreadId(target.id);
                }
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
        }
    };

    useEffect(() => {
        fetchThreadsApi();
    }, [leadIdParam]);

    const fetchMessagesApi = async (threadId) => {
        const res = await api.get(`/team-inbox/threads/${threadId}/messages`);
        return res.data;
    };

    const postReplyApi = async (threadId, replyText) => {
        const res = await api.post(`/team-inbox/threads/${threadId}/reply`, { body_text: replyText });
        return res.data;
    };

    const handleSelectThread = (threadId) => {
        setActiveThreadId(threadId);
    };

    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <div className="team-inbox-container">
            <ThreadList
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={handleSelectThread}
            />
            {activeThreadId ? (
                <ConversationView
                    threadId={activeThreadId}
                    lead={activeThread?.lead}
                    fetchMessagesApi={fetchMessagesApi}
                    postReplyApi={postReplyApi}
                />
            ) : (
                <div className="team-inbox-right-panel empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Select a conversation from the left to view messages</p>
                </div>
            )}
        </div>
    );
};

export default TeamInboxLayout;
