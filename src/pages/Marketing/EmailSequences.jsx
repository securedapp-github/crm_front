import { useState, useEffect } from 'react';
import { getSequences, deleteSequence } from '../../api/sequence';
import { Link, useNavigate } from 'react-router-dom';
import LeadList from './LeadList';
import { useToast } from '../../components/ToastProvider';



export default function EmailSequences() {
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { show } = useToast();

    // UI State
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'alphabetical'
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active'
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
    const [openMenuId, setOpenMenuId] = useState(null);
    const [tab, setTab] = useState('sequences'); // 'sequences' | 'leads'



    useEffect(() => {
        fetchSequences();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchSequences = async () => {
        setLoading(true);
        try {
            const res = await getSequences();
            setSequences(res.data?.data || []);
        } catch (err) {
            show('Failed to fetch sequences', 'error');
        } finally {
            setLoading(false);
        }
    };



    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

    const handleDeleteClick = (e, seq) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setDeleteModal({ isOpen: true, id: seq.id, name: seq.name });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await deleteSequence(deleteModal.id);
            setSequences(sequences.filter(s => s.id !== deleteModal.id));
            show('Sequence deleted', 'success');
            setDeleteModal({ isOpen: false, id: null, name: '' });
        } catch (err) {
            show('Failed to delete sequence', 'error');
        }
    };

    const handleDelete = (e, id) => {
        // Legacy handler kept if needed, but we use handleDeleteClick now
        e.stopPropagation();
    }

    const calculateSequenceDuration = (steps) => {
        if (!steps || steps.length === 0) return 0;
        const maxOffset = Math.max(...steps.map(s => s.dayOffset));
        return maxOffset;
    };

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Filter & Sort Logic
    const filteredSequences = sequences
        .filter(seq => {
            if (filterStatus === 'active' && !seq.isActive) return false;
            if (searchTerm && !seq.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full overflow-y-auto bg-white" onClick={() => setOpenMenuId(null)}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/marketing-team')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                        title="Go Back"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-4xl font-extrabold text-slate-900 font-serif tracking-tight">Sequences</h1>
                </div>
            </div>

            {/* Navigation Cards */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setTab('sequences')}
                    className={`flex-1 min-w-[200px] max-w-sm rounded-xl border p-4 text-left transition-all ${tab === 'sequences' ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                >
                    <div className="font-semibold text-slate-900">All Sequences</div>
                    <div className="mt-1 text-sm text-slate-500">Manage your email automation workflows</div>
                </button>
                <button
                    onClick={() => setTab('leads')}
                    className={`flex-1 min-w-[200px] max-w-sm rounded-xl border p-4 text-left transition-all ${tab === 'leads' ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                >
                    <div className="font-semibold text-slate-900">Sequences Lead</div>
                    <div className="mt-1 text-sm text-slate-500">Marketing Campaigns & Auto-Enrollment</div>
                </button>
            </div>

            {tab === 'leads' ? (
                <div className="bg-white rounded-xl border border-slate-200 p-1">
                    <LeadList initialFilter="marketing" />
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-10">
                        {/* Search Bar */}
                        <div className="relative w-full max-w-md mr-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                                placeholder="Search sequences..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSortBy(prev => prev === 'newest' ? 'alphabetical' : 'newest'); }}
                                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors min-w-[140px] justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93L17.66 6.34C18.16 6.84 18.5 7.54 18.5 8.5C18.5 10.43 16.93 12 15 12C13.07 12 11.5 10.43 11.5 8.5C11.5 7.54 11.84 6.84 12.34 6.34L10.93 4.93C10.04 5.72 9.5 6.88 9.5 8.5C9.5 11.54 11.96 14 15 14C18.04 14 20.5 11.54 20.5 8.5C20.5 6.88 19.96 5.72 19.07 4.93Z" /></svg>
                                        <span>{sortBy === 'newest' ? 'Newest' : 'Alphabetical'}</span>
                                    </div>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setFilterStatus(prev => prev === 'all' ? 'active' : 'all'); }}
                                    className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors min-w-[100px] justify-between ${filterStatus === 'active' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                        <span>{filterStatus === 'active' ? 'Active' : 'All'}</span>
                                    </div>
                                </button>

                                <div className="flex bg-white border border-slate-300 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 border-r border-slate-300 ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('new')}
                                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <span>+ New sequence</span>
                            </button>
                        </div>
                    </div>



                    {/* Content */}
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-64 bg-slate-50 rounded-lg animate-pulse" />
                            ))
                        ) : filteredSequences.length === 0 ? (
                            <div className="col-span-full py-32 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <div className="text-slate-300 mb-4 text-6xl font-light">✉️</div>
                                <h3 className="text-2xl font-semibold text-slate-800 mb-2">No sequences found</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-6">Try adjusting your filters or create a new sequence.</p>
                                <button
                                    onClick={() => navigate('new')}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Create Sequence
                                </button>
                            </div>
                        ) : (
                            filteredSequences.map(seq => (
                                <div
                                    key={seq.id}
                                    onClick={() => navigate(`${seq.id}`)}
                                    className={`bg-white border border-slate-100 rounded-xl hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer group relative ${viewMode === 'grid' ? 'p-8 flex flex-col min-h-[280px]' : 'p-6 flex items-center justify-between'}`}
                                    style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}
                                >
                                    {/* Grid View Content */}
                                    {viewMode === 'grid' && (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${seq.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{seq.name}</h3>
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === seq.id ? null : seq.id); }}
                                                        className="text-slate-300 hover:text-slate-600 p-1"
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openMenuId === seq.id && (
                                                        <div className="absolute right-0 top-8 bg-white shadow-xl border border-slate-100 rounded-lg w-40 py-2 z-10 animate-fade-in">
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, seq)}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-slate-400 text-sm italic mb-10">
                                                A {calculateSequenceDuration(seq.steps)} day sequence with {seq.steps?.length || 0} emails
                                            </p>

                                            <div className="mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Status</div>
                                                    <div className={`text-sm font-semibold ${seq.isActive ? 'text-green-600' : 'text-slate-500'}`}>{seq.isActive ? 'Active' : 'Draft'}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* List View Content */}
                                    {viewMode === 'list' && (
                                        <>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-3 h-3 rounded-full ${seq.isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{seq.name}</h3>
                                                    <p className="text-slate-400 text-sm">{seq.steps?.length || 0} emails • {calculateSequenceDuration(seq.steps)} day duration</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === seq.id ? null : seq.id); }}
                                                        className="text-slate-300 hover:text-slate-600 p-2"
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                    </button>
                                                    {openMenuId === seq.id && (
                                                        <div className="absolute right-0 top-8 bg-white shadow-xl border border-slate-100 rounded-lg w-40 py-2 z-10">
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, seq)}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                </>
            )}
            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden scale-100 opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Sequence?</h3>
                            <p className="text-slate-500 mb-6">
                                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteModal.name}"</span>?
                                <br />This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-md transition-all active:scale-[0.98]"
                                >
                                    Delete Sequence
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
