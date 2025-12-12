import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { createPost } from '../../api/marketing';
import { useToast } from '../../components/ToastProvider';
import { api } from '../../api/auth';

export default function ActivityCreateFromCalendar({ date, onClose, onCreated }) {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        platform: 'LinkedIn',
        campaign: '',
        scheduledAt: date ? new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '',
        status: 'scheduled',
        assignedTo: '',
        recurrence: null
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [conflictWarning, setConflictWarning] = useState(null);

    // Recurrence State Helper
    const [recurrenceType, setRecurrenceType] = useState('none'); // none, daily, weekly, monthly

    const { show } = useToast();

    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user'));
            setUser(u);
            if (u && u.role === 'sales') {
                setFormData(prev => ({ ...prev, assignedTo: u.id }));
            }
        } catch (e) { console.error(e) }

        // Fetch users for assignment (Sales only)
        api.get('/auth/users?role=sales').then(res => setUsers(res.data.data)).catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e, force = false) => {
        e.preventDefault();
        setLoading(true);

        // Format recurrence
        let recurrence = null;
        if (recurrenceType !== 'none') {
            recurrence = { freq: recurrenceType, interval: 1 };
        }

        try {
            await createPost({ ...formData, recurrence }, force);
            show('Post created successfully', 'success');
            onCreated();
            onClose();
        } catch (err) {
            if (err.response?.status === 409) {
                setConflictWarning('Warning: A post is already scheduled for this time/platform.');
            } else {
                show('Failed to create post', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title="Schedule New Post"
            actions={
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-3 py-2 border rounded-md text-sm">Cancel</button>
                    {conflictWarning ? (
                        <button
                            onClick={(e) => handleSubmit(e, true)}
                            className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700"
                        >
                            Ignore Conflict & Save
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.title}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Post'}
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {conflictWarning && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded text-sm border border-amber-200">
                        {conflictWarning}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700">Title</label>
                    <input
                        className="w-full border rounded-md px-3 py-2 mt-1"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        autoFocus
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Content</label>
                    <textarea
                        className="w-full border rounded-md px-3 py-2 mt-1 h-24"
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Write your post content here..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Platform</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={formData.platform}
                            onChange={e => setFormData({ ...formData, platform: e.target.value })}
                        >
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Twitter">Twitter</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Email">Email</option>
                            <option value="Blog">Blog</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Status</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="draft">Draft</option>
                            <option value="for_review">For Review</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="approved">Approved</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Campaign</label>
                        <input
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={formData.campaign}
                            onChange={e => setFormData({ ...formData, campaign: e.target.value })}
                            placeholder="e.g. Q1 Launch"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Scheduled At</label>
                        <input
                            type="datetime-local"
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={formData.scheduledAt}
                            onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                        />
                    </div>
                </div>

                {/* Only show Assign To for non-sales users (e.g. admin) */}
                {user && user.role !== 'sales' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Assign To</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={formData.assignedTo}
                            onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                        >
                            <option value="">-- Unassigned --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700">Recurrence</label>
                    <select
                        className="w-full border rounded-md px-3 py-2 mt-1"
                        value={recurrenceType}
                        onChange={e => setRecurrenceType(e.target.value)}
                    >
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
}
