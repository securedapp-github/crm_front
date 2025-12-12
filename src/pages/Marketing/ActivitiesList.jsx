import { useState, useEffect } from 'react';
import { getPosts, createPost } from '../../api/marketing';
import { useToast } from '../../components/ToastProvider';
import ActivityQuickModal from './ActivityQuickModal';
import Modal from '../../components/Modal';

export default function ActivitiesList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterPlatform, setFilterPlatform] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Selected post for editing
    const [selectedPost, setSelectedPost] = useState(null);
    const [section, setSection] = useState('pipeline'); // 'pipeline' | 'published'

    // Create Modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '',
        content: '',
        platform: 'LinkedIn',
        status: 'draft',
        campaign: '',
        scheduledAt: '',
        assignedTo: ''
    });
    const [users, setUsers] = useState([]);

    // Fetch users for generic usage (assignments)
    useEffect(() => {
        import('../../api/auth').then(module => {
            module.api.get('/auth/users?role=sales').then(res => setUsers(res.data.data)).catch(err => console.error(err));
        });
    }, []);

    const { show } = useToast();

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await getPosts({ platform: filterPlatform, status: filterStatus });
            setPosts(res.data?.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [filterPlatform, filterStatus]);

    const handleCreate = async () => {
        try {
            await createPost(createForm);
            show('Post created', 'success');
            setCreateOpen(false);
            show('Post created', 'success');
            setCreateOpen(false);
            setCreateForm({
                title: '',
                content: '',
                platform: 'LinkedIn',
                status: 'draft',
                campaign: '',
                scheduledAt: '',
                assignedTo: ''
            });
            fetchPosts();
        } catch (e) {
            show('Failed to create post', 'error');
        }
    }

    const platformColors = {
        LinkedIn: 'bg-blue-100 text-blue-700',
        Twitter: 'bg-sky-100 text-sky-700',
        Instagram: 'bg-pink-100 text-pink-700',
        Facebook: 'bg-indigo-100 text-indigo-700',
        Email: 'bg-emerald-100 text-emerald-700',
        Blog: 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="p-6">
            {/* Section Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
                <button
                    onClick={() => { setFilterStatus(''); setSection('pipeline'); }}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${section === 'pipeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Pipeline ({posts.filter(p => ['draft', 'for_review', 'scheduled', 'posted'].includes(p.status)).length})
                </button>
                <button
                    onClick={() => { setFilterStatus(''); setSection('completed'); }}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${section === 'completed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Completed ({posts.filter(p => ['approved'].includes(p.status)).length})
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <select
                        className="border rounded-lg px-3 py-2 text-sm"
                        value={filterPlatform}
                        onChange={e => setFilterPlatform(e.target.value)}
                    >
                        <option value="">All Platforms</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                    </select>
                </div>
                {section === 'pipeline' && (
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700"
                    >
                        + New Post
                    </button>
                )}
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                        <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Platform</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Scheduled At</th>
                            <th className="px-4 py-3">Assigned To</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan="5" className="px-4 py-4 text-center text-slate-500">Loading...</td></tr>
                        ) : (() => {
                            const filtered = posts.filter(p => {
                                if (section === 'pipeline') return ['draft', 'for_review', 'scheduled', 'posted'].includes(p.status);
                                return ['approved'].includes(p.status); // section === 'completed'
                            });

                            if (filtered.length === 0) return (
                                <tr><td colSpan="5" className="px-4 py-4 text-center text-slate-500">No {section} posts found</td></tr>
                            );

                            return filtered.map(post => (
                                <tr
                                    key={post.id}
                                    className="group hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <td className="px-4 py-3 font-medium text-slate-900">{post.title}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${platformColors[post.platform] || 'bg-slate-100'}`}>
                                            {post.platform}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`capitalize ${post.status === 'posted' ? 'text-emerald-600' : post.status === 'scheduled' ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {post.assignee?.name || '-'}
                                    </td>
                                </tr>
                            ));
                        })()}
                    </tbody>
                </table>
            </div>

            {createOpen && (
                <Modal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    title="Create New Post"
                    actions={
                        <div className="flex gap-2">
                            <button onClick={() => setCreateOpen(false)} className="px-3 py-2 border rounded-md text-sm">Cancel</button>
                            <button onClick={handleCreate} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">Create</button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Title</label>
                            <input className="w-full border rounded-md px-3 py-2 mt-1" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} autoFocus />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Content</label>
                            <textarea
                                className="w-full border rounded-md px-3 py-2 mt-1 h-20"
                                value={createForm.content}
                                onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                                placeholder="Post content..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Platform</label>
                                <select className="w-full border rounded-md px-3 py-2 mt-1" value={createForm.platform} onChange={e => setCreateForm({ ...createForm, platform: e.target.value })}>
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
                                <select className="w-full border rounded-md px-3 py-2 mt-1" value={createForm.status} onChange={e => setCreateForm({ ...createForm, status: e.target.value })}>
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
                                <input className="w-full border rounded-md px-3 py-2 mt-1" value={createForm.campaign} onChange={e => setCreateForm({ ...createForm, campaign: e.target.value })} placeholder="e.g. Q1 Launch" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Scheduled At</label>
                                <input
                                    type="datetime-local"
                                    className="w-full border rounded-md px-3 py-2 mt-1"
                                    value={createForm.scheduledAt}
                                    onChange={e => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Assign To</label>
                            <select
                                className="w-full border rounded-md px-3 py-2 mt-1"
                                value={createForm.assignedTo}
                                onChange={e => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                            >
                                <option value="">-- Unassigned --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedPost && (
                <ActivityQuickModal
                    isOpen={!!selectedPost}
                    postId={selectedPost.id}
                    onClose={() => setSelectedPost(null)}
                    onUpdate={fetchPosts}
                />
            )}
        </div>
    );
}
