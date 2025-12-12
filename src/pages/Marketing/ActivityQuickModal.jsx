import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { getPost, updatePost, deletePost, approvePost } from '../../api/marketing';
import CommentThread from '../../components/marketing/CommentThread';
import { useToast } from '../../components/ToastProvider';
import { api } from '../../api/auth';

export default function ActivityQuickModal({ isOpen, onClose, postId, onUpdate }) {
    const [post, setPost] = useState(null);
    const [tab, setTab] = useState('details'); // details | comments
    const [isReassigning, setIsReassigning] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const { show } = useToast();

    useEffect(() => {
        if (isOpen && postId) {
            loadPost();
        }
    }, [isOpen, postId]);

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(u);
        } catch (e) { }

        // Fetch sales users for reassignment
        api.get('/auth/users?role=sales').then(res => setUsers(res.data.data)).catch(err => console.error(err));
    }, []);

    const loadPost = async () => {
        try {
            const res = await getPost(postId);
            setPost(res.data.data);
        } catch (err) {
            show('Failed to load post details', 'error');
            onClose();
        }
    };

    const handleApprove = async () => {
        try {
            await approvePost(post.id);
            show('Post approved', 'success');
            loadPost();
            if (onUpdate) onUpdate();
        } catch (err) {
            show('Failed to approve', 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this post?')) return;
        try {
            await deletePost(post.id);
            show('Post deleted', 'success');
            if (onUpdate) onUpdate();
            onClose();
        } catch (err) {
            show('Failed to delete', 'error');
        }
    };

    const enableEdit = () => {
        setEditForm({
            title: post.title,
            content: post.content,
            scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '',
            assignedTo: post.assignee?.id || '',
            status: post.status
        });
        setIsEditing(true);
    };

    const saveEdit = async () => {
        try {
            await updatePost(post.id, editForm);
            show('Post updated', 'success');
            setIsEditing(false);
            loadPost();
            if (onUpdate) onUpdate();
        } catch (err) {
            show('Failed to update post', 'error');
        }
    };

    const handleReassign = async () => {
        try {
            await updatePost(post.id, { assignedTo: editForm.assignedTo });
            show('Post reassigned', 'success');
            setIsReassigning(false);
            loadPost();
            if (onUpdate) onUpdate();
        } catch (err) {
            show('Failed to reassign', 'error');
        }
    };

    if (!post) return null;

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Activity' : isReassigning ? 'Reassign Activity' : (
                <div className="flex items-center gap-2">
                    <span className="truncate max-w-[300px]">{post.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${post.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {post.status}
                    </span>
                </div>
            )}
            actions={
                <div className="flex gap-2 w-full justify-between items-center">
                    {!isEditing && !isReassigning && currentUser?.role === 'admin' && <button onClick={handleDelete} className="text-red-600 text-sm hover:underline">Delete</button>}
                    <div className="flex gap-2 ml-auto">
                        <button onClick={() => { setIsEditing(false); setIsReassigning(false); onClose(); }} className="px-3 py-2 border rounded text-sm">Close</button>

                        {isEditing ? (
                            <button onClick={saveEdit} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                                Save Changes
                            </button>
                        ) : isReassigning ? (
                            <button onClick={handleReassign} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                                Confirm Reassign
                            </button>
                        ) : (
                            <>
                                {(post.status === 'posted' || post.status === 'scheduled') && currentUser?.role === 'admin' && (
                                    <button onClick={handleApprove} className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                                        Approve
                                    </button>
                                )}

                                {currentUser?.role === 'admin' && (
                                    <button
                                        onClick={() => {
                                            setEditForm({ assignedTo: post.assignee?.id || '' });
                                            setIsReassigning(true);
                                        }}
                                        className="px-3 py-2 border border-indigo-200 text-indigo-700 rounded text-sm hover:bg-indigo-50"
                                    >
                                        Reassign
                                    </button>
                                )}
                                {currentUser?.role !== 'admin' && !['approved'].includes(post.status) && (
                                    <button
                                        onClick={() => {
                                            if (editForm.status) {
                                                // If already implemented status selector inline, or just enable edit with focus on status
                                                enableEdit(); // For now, use enableEdit as it allows changing status
                                            } else {
                                                enableEdit();
                                            }
                                        }}
                                        className="px-3 py-2 border border-indigo-200 text-indigo-700 rounded text-sm hover:bg-indigo-50"
                                    >
                                        Status
                                    </button>
                                )}
                                <button
                                    onClick={enableEdit}
                                    className={`px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 ${['approved', 'scheduled', 'posted'].includes(post.status) ? 'hidden' : ''}`}
                                >
                                    Edit
                                </button>
                            </>
                        )}
                    </div>
                </div>
            }
        >
            <div className="min-h-[300px] flex flex-col">
                {!isEditing && !isReassigning && (
                    <div className="flex border-b mb-4">
                        <button
                            onClick={() => setTab('details')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setTab('comments')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Comments ({post.comments?.length || 0})
                        </button>
                    </div>
                )}

                <div className="flex-1">
                    {isReassigning ? (
                        <div className="py-8 space-y-4">
                            <p className="text-sm text-slate-600">Select a new sales representative to handle this activity:</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Assign To</label>
                                <select
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={editForm.assignedTo}
                                    onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                                >
                                    <option value="">-- Unassigned --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : isEditing ? (
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Title</label>
                                <input
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Schedule</label>
                                <input
                                    type="datetime-local"
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={editForm.scheduledAt}
                                    onChange={e => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Reassign To</label>
                                <select
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={editForm.assignedTo}
                                    onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                                >
                                    <option value="">-- Unassigned --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Content</label>
                                <textarea
                                    className="w-full border rounded px-3 py-2 mt-1 h-32"
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    className="w-full border rounded px-3 py-2 mt-1"
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="for_review">For Review</option>
                                    <option value="scheduled">Scheduled</option>
                                    {/* Only Admin can set to Approved directly */}
                                    {currentUser?.role === 'admin' && <option value="approved">Approved</option>}
                                    <option value="posted">Posted</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full">
                            {tab === 'details' ? (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <span>🗓</span>
                                            <span>{post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'No date set'}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <span className="capitalize">{post.platform}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Post Content</label>
                                        <div className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                            {post.content || <span className="text-slate-400 italic">No content provided for this post.</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Assigned To</label>
                                            <div className="text-sm font-medium text-slate-900">{post.assignee?.name || 'Unassigned'}</div>
                                        </div>
                                        {post.campaign && (
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Campaign</label>
                                                <div className="text-sm font-medium text-slate-900">{post.campaign}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <CommentThread
                                    postId={post.id}
                                    comments={post.comments}
                                    onCommentAdded={(newComment) => {
                                        setPost(prev => ({
                                            ...prev,
                                            comments: [newComment, ...(prev.comments || [])]
                                        }));
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
