import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSequence, updateSequence, addStep, updateStep, deleteStep, reorderSteps, getSequenceStats, getSequenceSubscribers, enrollLead } from '../../api/sequence';
import { getLeads } from '../../api/lead';
import { getMe } from '../../api/auth';
import { useToast } from '../../components/ToastProvider';
import RichTextEditor from '../../components/RichTextEditor';

export default function SequenceBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { show } = useToast();

    const [sequence, setSequence] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStepId, setSelectedStepId] = useState(null);
    const [activeTab, setActiveTab] = useState('Content'); // Content, Reports, Settings
    const [sidebarTab, setSidebarTab] = useState('Emails'); // Emails, Styles
    const [stats, setStats] = useState(null);
    const [subscribers, setSubscribers] = useState([]);

    // Edit State
    const [draftStep, setDraftStep] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // UI Helpers
    const [showPreviewTextModal, setShowPreviewTextModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollLeadId, setEnrollLeadId] = useState('');
    const [availableLeads, setAvailableLeads] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingLeads, setLoadingLeads] = useState(false);

    useEffect(() => {
        fetchSequence();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'Reports') {
            fetchStats();
        }
    }, [activeTab]);

    const fetchSequence = async () => {
        setLoading(true);
        try {
            const res = await getSequence(id);
            setSequence(res.data?.data);
            if (res.data?.data?.steps?.length > 0 && !selectedStepId) {
                selectStep(res.data.data.steps[0]);
            }
        } catch (err) {
            show('Failed to fetch sequence', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [statsRes, subsRes] = await Promise.all([
                getSequenceStats(id),
                getSequenceSubscribers(id)
            ]);
            setStats(statsRes.data?.data);
            setSubscribers(subsRes.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const selectStep = (step) => {
        setSelectedStepId(step.id);
        setDraftStep({ ...step });
    };

    const handleAddStep = async () => {
        try {
            const nextDayOffset = sequence.steps.length > 0
                ? (sequence.steps[sequence.steps.length - 1].dayOffset + 1)
                : 1;

            const res = await addStep(id, {
                dayOffset: nextDayOffset,
                subject: '',
                content: '<div></div>',
                isPublished: false,
                previewText: '',
                template: 'text-only'
            });

            const newStep = res.data.data;
            const updatedSteps = [...sequence.steps, newStep];
            setSequence({ ...sequence, steps: updatedSteps });
            selectStep(newStep);
            show('Step added', 'success');
        } catch (err) {
            show('Failed to add step', 'error');
        }
    };

    const handleSaveStep = async () => {
        if (!draftStep) return;
        setIsSaving(true);
        try {
            await updateStep(draftStep.id, draftStep);
            const updatedSteps = sequence.steps.map(s => s.id === draftStep.id ? draftStep : s);
            setSequence({ ...sequence, steps: updatedSteps });
            show('Saved', 'success');
        } catch (err) {
            show('Failed to save', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await updateSequence(id, {
                settings: sequence.settings,
                senderEmail: sequence.senderEmail,
                triggerType: sequence.triggerType,
                triggerValue: sequence.triggerValue,
                isActive: sequence.isActive
            });
            show('Settings saved', 'success');
        } catch (err) {
            show('Failed to save settings', 'error');
        }
    };

    const handleDeleteStep = async (stepId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this email?')) return;
        try {
            await deleteStep(stepId);
            const remaining = sequence.steps.filter(s => s.id !== stepId);
            setSequence({ ...sequence, steps: remaining });
            if (selectedStepId === stepId) {
                setSelectedStepId(null);
                setDraftStep(null);
            }
            show('Deleted', 'success');
        } catch (err) {
            show('Failed to delete', 'error');
        }
    };

    const handleEnroll = async () => {
        if (!enrollLeadId) return;
        try {
            await enrollLead({ leadId: enrollLeadId, sequenceId: id });
            show('Lead enrolled successfully', 'success');
            setShowEnrollModal(false);
            setEnrollLeadId('');
            // Refresh stats
            fetchStats();
        } catch (err) {
            show(err.response?.data?.message || 'Failed to enroll lead', 'error');
        }
    };

    useEffect(() => {
        getMe().then(res => setCurrentUser(res.data.data)).catch(err => console.error(err));
    }, []);

    const fetchLeadsForEnrollment = async () => {
        setLoadingLeads(true);
        try {
            const res = await getLeads();
            let leads = res.data.data || [];

            // Scope to assigned leads if Sales View
            const isSalesView = window.location.pathname.includes('/sales/');
            if (isSalesView && currentUser) {
                leads = leads.filter(l => l.assignedTo === currentUser.id);
            }
            setAvailableLeads(leads);
        } catch (err) {
            show('Failed to fetch leads', 'error');
        } finally {
            setLoadingLeads(false);
        }
    };

    const handleBack = () => navigate('/dashboard/marketing-team/sequences');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!sequence) return <div className="p-10">Sequence not found</div>;

    // Helper for Settings Tab
    const toggleDay = (dayIndex) => {
        const currentDays = sequence.settings?.sendDays || [1, 2, 3, 4, 5, 6, 7];
        let newDays;
        if (currentDays.includes(dayIndex)) {
            newDays = currentDays.filter(d => d !== dayIndex);
        } else {
            newDays = [...currentDays, dayIndex].sort();
        }
        setSequence({ ...sequence, settings: { ...sequence.settings, sendDays: newDays } });
    };

    // Style Helpers
    const updateStyle = (key, value) => {
        const newSettings = {
            ...sequence.settings,
            styles: { ...(sequence.settings?.styles || {}), [key]: value }
        };
        setSequence({ ...sequence, settings: newSettings });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-white font-sans">
            {/* Top Navigation Bar */}
            <div className="border-b px-8 py-4 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="text-slate-400 hover:text-slate-800 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <span className="text-xl font-medium text-slate-700">{sequence?.name || 'Untitled Sequence'}</span>
                    </div>
                    {/* Global Enroll Button */}
                    <button
                        onClick={() => { setShowEnrollModal(true); fetchLeadsForEnrollment(); }}
                        className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <span>+ Enroll Leads</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 text-sm font-medium text-slate-500">
                    {['Content', 'Reports', 'Settings'].map(tab => (
                        <button
                            key={tab}
                            className={`pb-4 -mb-4 border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-700'}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">

                {activeTab === 'Content' && (
                    <>
                        {/* Editor */}
                        <div className="flex-1 overflow-y-auto bg-white p-8 md:p-12">
                            {draftStep ? (
                                <div className="max-w-3xl">
                                    <div className="mb-8">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Subject line</label>
                                        <div className="flex gap-4">
                                            <input
                                                className="flex-1 text-2xl font-bold text-slate-900 border-none focus:ring-0 p-0 placeholder:text-slate-300 focus:outline-none"
                                                placeholder="Write a compelling subject..."
                                                value={draftStep.subject}
                                                onChange={(e) => setDraftStep({ ...draftStep, subject: e.target.value })}
                                                onBlur={handleSaveStep}
                                            />
                                            <button
                                                onClick={() => setShowPreviewTextModal(true)}
                                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-sm font-medium transition-colors whitespace-nowrap"
                                            >
                                                Edit preview text
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mb-6 border-b pb-6 border-slate-100">
                                        {/* Published */}
                                        <div className="flex flex-col gap-1 border-r border-slate-100 pr-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Published</span>
                                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={draftStep.isPublished}
                                                    onChange={(e) => {
                                                        const newState = { ...draftStep, isPublished: e.target.checked };
                                                        setDraftStep(newState);
                                                        updateStep(newState.id, newState);
                                                    }}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {/* Timer */}
                                        <div className="flex flex-col gap-1 pr-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Send this email</span>
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <select
                                                        className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={draftStep.dayOffset}
                                                        onChange={(e) => {
                                                            const newState = { ...draftStep, dayOffset: parseInt(e.target.value) };
                                                            setDraftStep(newState);
                                                            updateStep(newState.id, newState);
                                                        }}
                                                    >
                                                        <option value={0}>Immediately</option>
                                                        {[1, 2, 3, 4, 5, 7, 10, 14, 30].map(d => (
                                                            <option key={d} value={d}>After {d} day{d > 1 ? 's' : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Template */}
                                        <div className="flex flex-col gap-1 flex-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Template</span>
                                            <div className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1.5 flex justify-between items-center group">
                                                <span className="capitalize">{draftStep.template?.replace('-', ' ') || 'Text only'}</span>
                                                <button
                                                    onClick={() => setShowTemplateModal(true)}
                                                    className="text-xs font-medium text-slate-600 hover:text-indigo-600"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={(e) => handleDeleteStep(draftStep.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                        </button>
                                    </div>

                                    <div className="min-h-[500px]">
                                        <RichTextEditor
                                            value={draftStep.content}
                                            onChange={(val) => setDraftStep(prev => ({ ...prev, content: val }))}
                                            placeholder="Type / to insert content..."
                                        />
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={handleSaveStep}
                                                className={`px-4 py-2 rounded text-sm text-white transition-colors ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                            >
                                                {isSaving ? 'Saving...' : 'Save Draft'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <p>Select an email from the list to edit</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="w-80 bg-white border-l flex flex-col shrink-0">
                            <div className="flex border-b text-sm font-medium text-slate-500">
                                <button
                                    className={`flex-1 py-3 border-b-2 transition-colors ${sidebarTab === 'Emails' ? 'border-indigo-800 text-indigo-800 font-bold' : 'border-transparent hover:text-slate-800'}`}
                                    onClick={() => setSidebarTab('Emails')}
                                >
                                    Emails
                                </button>
                                <button
                                    className={`flex-1 py-3 border-b-2 transition-colors ${sidebarTab === 'Styles' ? 'border-indigo-800 text-indigo-800 font-bold' : 'border-transparent hover:text-slate-800'}`}
                                    onClick={() => setSidebarTab('Styles')}
                                >
                                    Styles
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                {sidebarTab === 'Emails' ? (
                                    <div className="space-y-4">
                                        {sequence?.steps?.map((step) => (
                                            <div
                                                key={step.id}
                                                onClick={() => selectStep(step)}
                                                className={`p-4 rounded-lg cursor-pointer border transition-all hover:shadow-md bg-white ${selectedStepId === step.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}
                                            >
                                                <div className="mb-2 font-medium text-slate-800 line-clamp-1">{step.subject || 'Write a compelling subject...'}</div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        {step.dayOffset === 0 ? 'Immediately' : `${step.dayOffset} day${step.dayOffset > 1 ? 's' : ''}`}
                                                    </div>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${step.isPublished ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                        {step.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={handleAddStep} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors">+ Add Email</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Heading Font</label>
                                            <select
                                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                                                value={sequence?.settings?.styles?.headingFont || 'Inter'}
                                                onChange={(e) => updateStyle('headingFont', e.target.value)}
                                            >
                                                <option value="Inter">Inter (Sans-serif)</option>
                                                <option value="Merriweather">Merriweather (Serif)</option>
                                                <option value="Roboto Mono">Roboto Mono (Monospace)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Body Font</label>
                                            <select
                                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                                                value={sequence?.settings?.styles?.bodyFont || 'Inter'}
                                                onChange={(e) => updateStyle('bodyFont', e.target.value)}
                                            >
                                                <option value="Inter">Inter</option>
                                                <option value="Lato">Lato</option>
                                                <option value="Arial">Arial</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Button Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                                                    value={sequence?.settings?.styles?.buttonColor || '#4F46E5'}
                                                    onChange={(e) => updateStyle('buttonColor', e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-slate-300 rounded px-3 text-sm"
                                                    value={sequence?.settings?.styles?.buttonColor || '#4F46E5'}
                                                    onChange={(e) => updateStyle('buttonColor', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveSettings}
                                            className="w-full py-2 bg-black text-white rounded text-sm font-medium hover:bg-slate-800"
                                        >
                                            Save Styles
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'Reports' && (
                    <div className="flex-1 bg-slate-50 p-8 flex gap-8">
                        {/* Sidebar Stats */}
                        <div className="w-64 space-y-4 shrink-0">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Sequence Stats</h3>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-3xl font-bold text-slate-900">{stats?.totalEnrolled || 0}</div>
                                <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Total Enrolled</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-3xl font-bold text-green-600">{stats?.active || 0}</div>
                                <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Active Enrolled Leads</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="text-3xl font-bold text-slate-600">{stats?.completed || 0}</div>
                                <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Completed</div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col gap-8">
                            {/* Email Performance */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Email Performance</h3>
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                            <tr>
                                                <th className="px-6 py-3">Email Step</th>
                                                <th className="px-6 py-3 text-right">Sends</th>
                                                <th className="px-6 py-3 text-right">Open Rate</th>
                                                <th className="px-6 py-3 text-right">Click Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sequence?.steps?.map(step => (
                                                <tr key={step.id}>
                                                    <td className="px-6 py-4 font-medium text-slate-800">{step.subject || 'Untitled'}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">{stats?.emailsSent || 0}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">0%</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">0%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Subscriber List */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase">Enrolled Leads</h3>
                                    <button
                                        onClick={() => { setShowEnrollModal(true); fetchLeadsForEnrollment(); }}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                        + Enroll Lead
                                    </button>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                            <tr>
                                                <th className="px-6 py-3">Lead Name</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Current Step</th>
                                                <th className="px-6 py-3 text-right">Enrolled Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {subscribers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                                        No subscribers found in this sequence.
                                                    </td>
                                                </tr>
                                            ) : (
                                                subscribers.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-slate-900">{sub.lead?.firstName} {sub.lead?.lastName}</div>
                                                            <div className="text-slate-500 text-xs">{sub.lead?.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                                sub.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {sub.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">
                                                            {sub.currentStep ? (
                                                                <span>Step {sub.currentStep.dayOffset}: {sub.currentStep.subject}</span>
                                                            ) : (
                                                                <span className="italic text-slate-400">None</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-500">
                                                            {new Date(sub.enrollmentDate).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Settings' && (
                    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-8 pb-32">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-bold text-slate-900">Sequence Settings</h2>
                                </div>

                                {/* Status Card */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${sequence.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    <div className="p-6 pl-8 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Sequence Status</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {sequence.isActive
                                                    ? 'Active. Emails are being scheduled and sent.'
                                                    : 'Paused. No emails will be sent.'}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={sequence.isActive || false}
                                                onChange={(e) => setSequence({ ...sequence, isActive: e.target.checked })}
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Main Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left Col: Automation */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                                Enrollment Automation
                                            </h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Trigger</label>
                                                    <select
                                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                        value={sequence.triggerType || 'MANUAL'}
                                                        onChange={(e) => setSequence({ ...sequence, triggerType: e.target.value, triggerValue: (e.target.value === 'AUTO_STATUS_CHANGE' ? sequence.triggerValue : null) })}
                                                    >
                                                        <option value="MANUAL">Manual Enrollment Only</option>
                                                        <option value="AUTO_NEW_LEAD">Auto - New Lead Created</option>

                                                    </select>
                                                </div>

                                                {(sequence.triggerType || 'MANUAL') === 'MANUAL' && (
                                                    <div className="bg-slate-50 text-slate-600 text-sm p-4 rounded-lg flex gap-3">
                                                        <svg className="shrink-0 mt-0.5 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                                        <p>Leads must be manually enrolled into this sequence via the "Enroll Lead" button.</p>
                                                    </div>
                                                )}


                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                                Sender Configuration
                                            </h3>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">From Email Address</label>
                                                <input
                                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                    placeholder="e.g. newsletter@mycompany.com"
                                                    value={sequence.senderEmail || ''}
                                                    onChange={(e) => setSequence({ ...sequence, senderEmail: e.target.value })}
                                                />
                                                <p className="text-xs text-slate-400 mt-2">Emails will appear to come from this address.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Col: Schedule */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                                            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                Schedule
                                            </h3>

                                            <div className="mb-6">
                                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Sending Time</label>
                                                <input
                                                    type="time"
                                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500"
                                                    value={sequence.settings?.sendTime || '11:00'}
                                                    onChange={(e) => setSequence({ ...sequence, settings: { ...sequence.settings, sendTime: e.target.value } })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Sending Days</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                                        const dayNum = idx + 1;
                                                        const isSelected = (sequence.settings?.sendDays || [1, 2, 3, 4, 5, 6, 7]).includes(dayNum);
                                                        return (
                                                            <button
                                                                key={day}
                                                                onClick={() => toggleDay(dayNum)}
                                                                className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${isSelected
                                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                                                            >
                                                                {day.charAt(0)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="border-t bg-white p-4 px-8 flex justify-between items-center sticky bottom-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${sequence.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    {sequence.isActive ? 'Active' : 'Draft'}
                                </span>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-indigo-600 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Text Modal */}
            {showPreviewTextModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[400px]">
                        <h3 className="text-lg font-bold mb-4">Edit Preview Text</h3>
                        <p className="text-sm text-slate-500 mb-4">This text appears after the subject line in the inbox.</p>
                        <textarea
                            className="w-full border border-slate-300 rounded p-3 text-sm mb-4"
                            rows={3}
                            value={draftStep.previewText || ''}
                            onChange={(e) => setDraftStep({ ...draftStep, previewText: e.target.value })}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowPreviewTextModal(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded">Cancel</button>
                            <button
                                onClick={() => { handleSaveStep(); setShowPreviewTextModal(false); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[500px]">
                        <h3 className="text-lg font-bold mb-4">Choose a Template</h3>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {['text-only', 'plain', 'framed'].map(t => (
                                <div
                                    key={t}
                                    onClick={() => setDraftStep({ ...draftStep, template: t })}
                                    className={`border rounded-lg p-4 cursor-pointer hover:border-indigo-500 text-center ${draftStep.template === t ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200'}`}
                                >
                                    <div className="h-16 bg-slate-100 mb-2 rounded"></div>
                                    <div className="text-sm font-medium capitalize">{t.replace('-', ' ')}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded">Cancel</button>
                            <button
                                onClick={() => { handleSaveStep(); setShowTemplateModal(false); }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded"
                            >
                                Select Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Enroll Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[400px]">
                        <h3 className="text-lg font-bold mb-4">Enroll Lead</h3>
                        <p className="text-sm text-slate-500 mb-4">{window.location.pathname.includes('/sales/') ? "Select one of your assigned leads." : "Select a lead to enroll."}</p>

                        {loadingLeads ? (
                            <div className="py-4 text-center text-slate-500">Loading leads...</div>
                        ) : (
                            <select
                                className="w-full border border-slate-300 rounded p-3 text-sm mb-4 bg-white"
                                value={enrollLeadId}
                                onChange={(e) => setEnrollLeadId(e.target.value)}
                            >
                                <option value="">Select a lead...</option>
                                {availableLeads.map(lead => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.firstName} {lead.lastName} ({lead.email}) {lead.status ? `- ${lead.status}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowEnrollModal(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded">Cancel</button>
                            <button
                                onClick={handleEnroll}
                                className="px-4 py-2 bg-indigo-600 text-white rounded"
                            >
                                Enroll Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
