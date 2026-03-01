import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead } from '../../api/lead';

export default function LeadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLead = async () => {
            try {
                const res = await getLead(id);
                if (res.data?.success) {
                    setLead(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch lead details:', err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchLead();
    }, [id]);

    if (loading) return <div className="p-6 text-center text-slate-500">Loading Lead Details...</div>;
    if (!lead) return <div className="p-6 text-center text-slate-500">Lead not found.</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 bg-white border rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">{lead.name}</h2>
                        <div className="text-slate-500 mt-1">{lead.company || 'No Company'}</div>
                    </div>
                    <button
                        onClick={() => navigate(`/dashboard/team-inbox?lead_id=${lead.id}`)}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                    >
                        Open Conversation
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <p className="text-xs font-semibold uppercase text-slate-500">Contact</p>
                        <p className="mt-1 text-sm">{lead.email || 'N/A'}</p>
                        <p className="mt-1 text-sm">{lead.phone || 'N/A'}</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-medium">{lead.status || 'New'}</p>
                        <p className="mt-1 text-sm text-slate-500">Score: {lead.score || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
