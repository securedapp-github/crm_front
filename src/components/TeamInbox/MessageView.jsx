import React, { useState } from 'react';
import dayjs from 'dayjs';

const MessageView = ({
    message,
    onReply,
    onAssign,
    onStatusChange,
    users = [],
    currentUser,
    replying
}) => {
    const [replyBody, setReplyBody] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = React.useRef(null);

    if (!message) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                Select a message to view details
            </div>
        );
    }

    const handleSubmitReply = (e) => {
        e.preventDefault();
        if (!replyBody.trim() && selectedFiles.length === 0) return;
        onReply(replyBody, selectedFiles, () => {
            setReplyBody('');
            setSelectedFiles([]);
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validation
        const totalFiles = [...selectedFiles, ...files];
        if (totalFiles.length > 5) {
            alert('Maximum 5 files allowed');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} exceeds 10MB limit`);
                return false;
            }
            return true;
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const renderAttachments = (attachments = []) => {
        if (!attachments || attachments.length === 0) return null;

        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

        return (
            <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map(att => {
                    const url = `${baseUrl}${att.file_url}`;
                    const isImage = att.file_type?.startsWith('image/');

                    return (
                        <div key={att.id} className="group relative">
                            {isImage ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-[180px] overflow-hidden rounded-lg border border-slate-200 hover:opacity-90 transition shadow-sm bg-white">
                                    <img src={url} alt={att.file_name} className="w-full h-32 object-cover" />
                                    <div className="p-1.5 text-[10px] text-slate-500 truncate italic">
                                        {att.file_name}
                                    </div>
                                </a>
                            ) : (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-indigo-600 hover:bg-slate-50 transition shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    <span className="font-medium underline truncate max-w-[120px]">{att.file_name}</span>
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Header */}
            <div className="border-b border-slate-100 p-4">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{message.subject || '(No Subject)'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-medium text-slate-700">{message.customer_name}</span>
                            <span className="text-sm text-slate-500">&lt;{message.customer_email}&gt;</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                            Received {dayjs(message.created_at).format('MMM D, YYYY [at] h:mm A')}
                        </span>
                    </div>

                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                        <select
                            value={message.status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="rounded-md border-slate-200 bg-slate-50 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="NEW">New</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="ACTIVE">Replied</option>
                            <option value="RESOLVED">Closed</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</label>
                        <select
                            value={message.assigned_to || ''}
                            onChange={(e) => onAssign(e.target.value || null)}
                            className="rounded-md border-slate-200 bg-slate-50 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Unassigned</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>


                    {message.active_viewer_id && message.activeViewer?.email !== currentUser?.email && (
                        <div className="ml-auto flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 border border-amber-100 animate-pulse">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            {message.activeViewer?.name || 'Someone'} is viewing this
                        </div>
                    )}

                </div>
            </div>

            {/* Content & Thread */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-8 rounded-lg bg-slate-50 p-6 border border-slate-100 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50"></div>
                    <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                        {message.body}
                    </div>
                    {renderAttachments(message.attachments)}
                </div>

                {/* Replies Thread */}
                {message.messages && message.messages.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Conversation Thread</h3>
                        {message.messages.map(reply => (
                            <div key={reply.id} className={`flex flex-col rounded-xl p-5 border shadow-sm ${reply.sender_type === 'agent' ? 'bg-indigo-50/40 border-indigo-100/60' : 'bg-slate-50/50 border-slate-200/50'}`}>
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${reply.sender_type === 'agent' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {(reply.sender_type === 'agent' ? (reply.agent?.name?.charAt(0) || 'A') : (message.customer_name?.charAt(0) || 'C'))}
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">
                                            {reply.sender_type === 'agent' ? (reply.agent?.name || 'Agent') : (message.customer_name || 'Customer')}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">{dayjs(reply.created_at).format('MMM D, h:mm A')}</span>
                                </div>
                                <div className="ml-10">
                                    <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                                        {reply.body}
                                    </div>
                                    {renderAttachments(reply.attachments)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Input */}
            <div className="border-t border-slate-100 bg-white p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                        <div key={idx} className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 animate-in fade-in slide-in-from-bottom-2">
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button
                                onClick={() => removeFile(idx)}
                                className="ml-1 rounded-full p-0.5 hover:bg-indigo-200 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSubmitReply} className="relative rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <textarea
                        rows="3"
                        placeholder="Type your message..."
                        className="w-full rounded-2xl border-none p-4 pb-12 text-sm focus:ring-0 resize-none"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        disabled={replying}
                    ></textarea>

                    <input
                        type="file"
                        id="file-attachment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    />

                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="Attach files (up to 5)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                        </button>
                    </div>

                    <div className="absolute bottom-3 right-3">
                        <button
                            type="submit"
                            disabled={replying || (!replyBody.trim() && selectedFiles.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {replying ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <span>Send</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MessageView;
