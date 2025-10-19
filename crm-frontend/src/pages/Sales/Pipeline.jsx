import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDeals, updateDeal } from '../../api/deal'

const STAGES = ['New','Proposal Sent','Negotiation','Closed Won','Closed Lost']

export default function Pipeline() {
  const [deals, setDeals] = useState([])
  const [dragging, setDragging] = useState(null)

  const fetchData = async () => {
    const res = await getDeals()
    setDeals(res.data?.data || [])
  }
  useEffect(()=>{ fetchData() }, [])

  const onDrop = async (stage) => {
    if (!dragging) return
    if (dragging.stage === stage) return
    await updateDeal(dragging.id, { stage })
    setDragging(null)
    fetchData()
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales Pipeline</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        {STAGES.map((stage) => (
          <div key={stage}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>onDrop(stage)}
            className="rounded-xl border bg-slate-50 min-h-[400px] p-3">
            <div className="font-semibold text-slate-900 mb-3">{stage}</div>
            <div className="space-y-3">
              {deals.filter(d=>d.stage===stage).map(d=> (
                <div key={d.id}
                  draggable
                  onDragStart={()=>setDragging(d)}
                  className="rounded-lg border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing">
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <div className="text-sm text-slate-600">₹{Number(d.value).toLocaleString()}</div>
                  <div className="mt-2">
                    <Link to={`/dashboard/sales/deals/${d.id}`} className="text-xs text-indigo-600 underline">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
