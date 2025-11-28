import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/auth'

export default function DeletedDeals() {
    const [deals, setDeals] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchDeletedDeals = async () => {
        setLoading(true)
        try {
            const res = await api.get('/sales/deleted')
            setDeals(res.data?.data || [])
        } catch (err) {
            console.error('Failed to fetch deleted deals', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDeletedDeals()
    }, [])

    const handleRestore = async (id) => {
        try {
            await api.post(`/sales/${id}/restore`)
            await fetchDeletedDeals()
        } catch (err) {
            console.error('Failed to restore deal', err)
            alert('Failed to restore deal')
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard/sales" className="text-indigo-600 hover:text-indigo-800">
                    ← Back to Pipeline
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Deleted Deals</h1>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : deals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No deleted deals found</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3">Value</th>
                                <th className="px-4 py-3">Stage</th>
                                <th className="px-4 py-3">Deleted At</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {deals.map(deal => (
                                <tr key={deal.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{deal.title}</td>
                                    <td className="px-4 py-3">₹{Number(deal.value).toLocaleString()}</td>
                                    <td className="px-4 py-3">{deal.stage}</td>
                                    <td className="px-4 py-3 text-slate-500">{new Date(deal.deletedAt).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleRestore(deal.id)}
                                            className="text-emerald-600 hover:text-emerald-800 font-medium"
                                        >
                                            Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
