import { useState, useEffect } from 'react';
import { getSequences, enrollLead } from '../api/sequence';
import { useToast } from '../components/ToastProvider';
import Modal from '../components/Modal';

export default function SequenceSelector({ open, onClose, leadId, leadName, onSuccess }) {
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(null);
    const { show } = useToast();

    useEffect(() => {
        if (open) {
            fetchSequences();
        }
    }, [open]);

    const fetchSequences = async () => {
        setLoading(true);
        try {
            const res = await getSequences();
            // Filter for manual sequences or those compatible with manual enrollment
            const allSeqs = res.data?.data || [];
            // Ideally we show all sequences, but maybe highlight manual ones? 
            // For now, show all active ones or user's ones. 
            // backend getSequences already filters by ownership for sales users.
            setSequences(allSeqs);
        } catch (err) {
            console.error(err);
            show('Failed to load sequences', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (sequenceId) => {
        setEnrolling(sequenceId);
        try {
            await enrollLead({ leadId, sequenceId });
            show(`${leadName || 'Lead'} enrolled successfully`, 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to enroll lead';
            show(msg, 'error');
        } finally {
            setEnrolling(null);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Enroll ${leadName || 'Lead'} in Sequence`}
        >
            <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-2">
                {loading ? (
                    <div className="py-8 text-center text-slate-500">Loading sequences...</div>
                ) : sequences.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-slate-500 mb-4">No sequences found.</p>
                        <p className="text-xs text-slate-400">Create a sequence in the "Sequences" tab first.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sequences.map(seq => (
                            <div
                                key={seq.id}
                                className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all"
                            >
                                <div>
                                    <h4 className="font-medium text-slate-900 group-hover:text-indigo-700">{seq.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span>{seq.steps?.length || 0} steps</span>
                                        <span>•</span>
                                        <span className={`px-1.5 py-0.5 rounded ${seq.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {seq.isActive ? 'Active' : 'Draft'}
                                        </span>
                                        <span>•</span>
                                        <span>{seq.triggerType === 'MANUAL' ? 'Manual' : 'Auto'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEnroll(seq.id)}
                                    disabled={!!enrolling}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${enrolling === seq.id
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                        }`}
                                >
                                    {enrolling === seq.id ? 'Enrolling...' : 'Enroll'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
