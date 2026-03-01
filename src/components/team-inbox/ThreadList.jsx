import React from 'react';

const ThreadList = ({ threads, activeThreadId, onSelectThread }) => {
    return (
        <div className="team-inbox-left-panel">
            <div className="team-inbox-header">
                <h2>Team Inbox</h2>
            </div>
            <div className="thread-list">
                {threads.length === 0 ? (
                    <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>
                        No conversations found.
                    </div>
                ) : (
                    threads.map(thread => {
                        const lastMsg = thread.messages?.[0];
                        const isActive = thread.id === activeThreadId;

                        return (
                            <div
                                key={thread.id}
                                className={`thread-item ${isActive ? 'active' : ''}`}
                                onClick={() => onSelectThread(thread.id)}
                            >
                                <div className="thread-item-header">
                                    <span className="thread-item-name">{thread.lead?.name || 'Unknown Lead'}</span>
                                    <span className="thread-item-time">
                                        {new Date(thread.last_message_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="thread-item-preview">
                                    {lastMsg ? (lastMsg.subject || lastMsg.body_text || 'No content') : 'No messages'}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ThreadList;
