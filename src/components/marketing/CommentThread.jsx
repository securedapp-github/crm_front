import { useState } from 'react';
import { addComment } from '../../api/marketing';

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function CommentThread({ postId, comments, onCommentAdded }) {
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        setSubmitting(true);
        try {
            const res = await addComment(postId, text);
            setText('');
            if (onCommentAdded) onCommentAdded(res.data.data);
        } catch (err) {
            console.error('Failed to comment', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-[200px] max-h-[400px] bg-slate-50 rounded-lg mb-4 text-sm">
                {comments && comments.length > 0 ? (
                    comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                                {c.user?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-slate-900">{c.user?.name}</span>
                                    <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{c.text}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-slate-500 py-8">No comments yet. Start the conversation!</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    className="flex-1 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                    placeholder="Write a comment..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={submitting}
                />
                <button
                    type="submit"
                    disabled={submitting || !text.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
