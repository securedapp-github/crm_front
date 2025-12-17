
import { useState } from 'react';
import { createSequence, addStep } from '../../api/sequence';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ToastProvider';

const EMAIL_TEMPLATES = [
    {
        id: 'blockchain-threats-intro',
        name: 'Initial Introduction (Day 1)',
        emails: [
            {
                subject: "Urgent: Is Your Blockchain Exposed to Real-Time Threats Right Now?",
                content: `Dear Sir/Madam,

Blockchain exploits drained over $1.7B in 2025 alone, with flash loans, unauthorised mints, and hidden admin functions striking silently in real time. Many DApps remain vulnerable due to the lack of continuous on-chain monitoring. Sudden event spikes or role changes often signal disaster before it’s too late.

SecureWatch by SecureDApp changes this. Our patented AI-driven threat detection continuously scans function calls, on-chain events, and anomalies in real time—delivering actionable risk scores and automated alerts via dashboards or APIs.

Protect your projects effortlessly.
👉 Start your free trial: [SecureWatch Trial Link]

Would love to hear your thoughts.

Best regards,
Abhishek Singh
Founder, SecureDApp`,
                dayOffset: 0
            }
        ]
    },
    {
        id: 'blockchain-threats-followup-1',
        name: 'Follow-Up 1 (Day 7)',
        emails: [
            {
                subject: "Still at Risk? SecureWatch Can Stop Blockchain Threats in Seconds",
                content: `Hi Sir/Madam,

Flash loan attacks and exploit patterns evolve daily. Without real-time vigilance, even audited smart contracts can be compromised.

SecureWatch instantly flags suspicious activity—unusual transfers, privilege changes, risky upgrades—so teams can react before damage occurs. It’s trusted by teams across DeFi and Web3 for proactive on-chain defence.

👉 Activate your free trial: [SecureWatch Trial Link]

Have questions or want a quick demo? Just reply to this email.

Best,
Abhishek Singh
Founder, SecureDApp`,
                dayOffset: 6
            }
        ]
    },
    {
        id: 'blockchain-threats-followup-2',
        name: 'Follow-Up 2 (Day 14)',
        emails: [
            {
                subject: "Final Alert: Don’t Let Threats Hit Your Blockchain Unseen",
                content: `Hello Sir/Madam,

Billions have been lost due to unmonitored on-chain risks. SecureWatch prevents this by continuously baselining your smart contracts and detecting deviations early—before exploits escalate.

Our patented scanning engine correlates events, function calls, and anomalies into clear incident alerts, tailored for both Indian and global Web3 projects.

👉 Secure your assets today: [SecureWatch Trial Link]

Happy to customise SecureWatch for your specific use case.

Cheers,
Abhishek Singh
Founder, SecureDApp`,
                dayOffset: 13
            }
        ]
    }
];

export default function CreateSequence() {
    const navigate = useNavigate();
    const { show } = useToast();

    // Form State
    const [newSeqName, setNewSeqName] = useState('');
    const [newSeqEmail, setNewSeqEmail] = useState('');
    const [triggerType, setTriggerType] = useState('MANUAL');
    const [triggerValue, setTriggerValue] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const [previewTemplate, setPreviewTemplate] = useState(null);

    const handleCreate = async () => {
        if (!newSeqName.trim()) return;
        setIsCreating(true);
        try {
            const res = await createSequence({
                name: newSeqName,
                senderEmail: newSeqEmail || null,
                triggerType,
                triggerValue: null,
                isActive: false
            });
            if (selectedTemplate) {
                const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
                if (template) {
                    for (const email of template.emails) {
                        await addStep(res.data.data.id, {
                            ...email,
                            isPublished: true,
                            template: 'plain'
                        });
                    }
                }
            }

            show('Sequence created', 'success');
            show('Sequence created', 'success');
            navigate(`../${res.data.data.id}`);
        } catch (err) {
            show('Failed to create sequence', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto h-full overflow-y-auto bg-white">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('..')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-3xl font-extrabold text-slate-900 font-serif tracking-tight">Create New Sequence</h1>
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Sequence Name</label>
                        <input
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow text-lg"
                            placeholder="e.g. Welcome Series"
                            value={newSeqName}
                            onChange={e => setNewSeqName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Sender Email (Optional)</label>
                            <input
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                                placeholder="e.g. newsletter@company.com"
                                value={newSeqEmail}
                                onChange={e => setNewSeqEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Enrollment Trigger</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-white"
                                value={triggerType}
                                onChange={e => setTriggerType(e.target.value)}
                            >
                                <option value="MANUAL">Manual Enrollment Only</option>
                                <option value="AUTO_NEW_LEAD">Auto - New Lead Created</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                {triggerType === 'MANUAL' && "You will manually add leads to this sequence."}
                                {triggerType === 'AUTO_NEW_LEAD' && "All newly created leads will be automatically enrolled."}
                            </p>
                        </div>
                    </div>

                    <div className="mb-10">
                        <label className="block text-lg font-semibold text-slate-900 mb-6 text-center">Choose a template (Optional)</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {EMAIL_TEMPLATES.map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
                                    className={`group relative flex flex-col items-center cursor-pointer transition-all duration-200`}
                                >
                                    <div className={`w-full aspect-[3/4] bg-white rounded-xl border-2 shadow-sm p-4 overflow-hidden relative transition-all ${selectedTemplate === template.id ? 'border-green-500 ring-4 ring-green-100 transform scale-[1.02]' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                                        {/* View Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewTemplate(template);
                                            }}
                                            className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full shadow hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                                            title="Preview Template Content"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        </button>

                                        {/* Mini Email Preview Visualization */}
                                        <div className="space-y-3 select-none overflow-hidden h-full">
                                            {/* Header */}
                                            <div className="border-b border-slate-100 pb-2 mb-2">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</div>
                                                <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                                                    {template.emails[0].subject}
                                                </div>
                                            </div>

                                            {/* Body Snippet */}
                                            <div className="text-[10px] text-slate-500 line-clamp-6 leading-relaxed whitespace-pre-line">
                                                {template.emails[0].content}
                                            </div>
                                        </div>

                                        {/* Preview Overlay Label */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent h-1/3 flex items-end justify-center pb-4 pointer-events-none">
                                            <span className="text-xs font-semibold text-slate-500 bg-white/90 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-200 shadow-sm">
                                                {template.emails.length} Emails
                                            </span>
                                        </div>

                                        {/* Selected Checkmark */}
                                        {selectedTemplate === template.id && (
                                            <div className="absolute top-2 left-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg animate-scale-in">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 text-center px-2">
                                        <h4 className={`font-medium ${selectedTemplate === template.id ? 'text-green-700 font-bold' : 'text-slate-700'}`}>{template.name}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                        <button
                            onClick={() => navigate('/dashboard/marketing-team/sequences')}
                            className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                            disabled={!newSeqName.trim() || isCreating}
                        >
                            {isCreating ? 'Creating...' : 'Create Sequence'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Template Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{previewTemplate.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{previewTemplate.emails.length} emails in this sequence</p>
                            </div>
                            <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 bg-slate-50/30">
                            {previewTemplate.emails.map((email, index) => (
                                <div key={index} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                                        <div className="font-semibold text-slate-700">Email #{index + 1}</div>
                                        <div className="text-xs font-medium px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                            {email.dayOffset === 0 ? 'Send Immediately' : `Send Day ${email.dayOffset + 1}`}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</span>
                                            <div className="text-slate-900 font-medium">{email.subject}</div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Content</span>
                                            <div className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                {email.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                            >
                                Close Preview
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTemplate(previewTemplate.id);
                                    setPreviewTemplate(null);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm"
                            >
                                Select this Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
