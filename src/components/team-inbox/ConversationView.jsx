import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const ConversationView = ({ threadId, lead, fetchMessagesApi, postReplyApi }) => {
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!threadId) return;

        const loadMessages = async () => {
            setLoading(true);
            try {
                const response = await fetchMessagesApi(threadId);
                if (response.success) {
                    setMessages(response.data);
                }
            } catch (error) {
                console.error('Failed to load messages', error);
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [threadId, fetchMessagesApi]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!replyText.trim()) return;

        try {
            const response = await postReplyApi(threadId, replyText);
            if (response.success) {
                setMessages([...messages, response.data]);
                setReplyText('');
            }
        } catch (error) {
            console.error('Failed to send reply', error);
        }
    };

    if (!threadId) {
        return <div className="team-inbox-right-panel empty-state">Select a conversation to view</div>;
    }

    return (
        <div className="team-inbox-right-panel">
            <div className="team-inbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Conversation with {lead?.name}</h2>
                {lead && (
                    <Link to={`/dashboard/leads/${lead.id}`} className="lead-link" title="Open Lead in CRM">
                        View Lead Detail ↗
                    </Link>
                )}
            </div>

            <div className="conversation-messages">
                {loading && <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading messages...</div>}

                {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`message-bubble ${msg.direction === 'incoming' ? 'message-incoming' : 'message-outgoing'}`}>
                        <div className="message-header">
                            <span className="message-sender">{msg.direction === 'incoming' ? msg.sender_email : 'Me (Team)'}</span>
                            <span className="message-time">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>

                        {msg.subject && <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{msg.subject}</div>}

                        <div className="message-body">{msg.body_text}</div>

                        {msg.attachment_path && (
                            <div className="message-attachments">
                                {JSON.parse(msg.attachment_path).map((path, i) => (
                                    <a key={i} href={path} target="_blank" rel="noopener noreferrer" className="attachment-chip">
                                        📎 Attachment {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="conversation-reply-box">
                <textarea
                    className="reply-textarea"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="reply-actions">
                    <button className="btn-send" onClick={handleSend} disabled={!replyText.trim()}>
                        Send Reply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConversationView;
