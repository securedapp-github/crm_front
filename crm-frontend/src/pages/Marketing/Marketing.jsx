import { useState } from 'react'
import CampaignList from './CampaignList'
import LeadList from './LeadList'
import LeadAnalytics from './LeadAnalytics'
import LeadScoring from './LeadScoring'
import LeadNurture from './LeadNurture'
import LeadConversion from './LeadConversion'

export default function Marketing() {
  const [tab, setTab] = useState('capture')

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Marketing & Lead Management</h1>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={()=>setTab('capture')} className={`px-3 py-2 rounded-md border ${tab==='capture'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900'}`}>Capture</button>
          <button onClick={()=>setTab('scoring')} className={`px-3 py-2 rounded-md border ${tab==='scoring'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900'}`}>Scoring</button>
          <button onClick={()=>setTab('nurture')} className={`px-3 py-2 rounded-md border ${tab==='nurture'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900'}`}>Nurturing</button>
          <button onClick={()=>setTab('conversion')} className={`px-3 py-2 rounded-md border ${tab==='conversion'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900'}`}>Conversion</button>
          <button onClick={()=>setTab('analytics')} className={`px-3 py-2 rounded-md border ${tab==='analytics'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900'}`}>Analytics</button>
        </div>
      </div>

      <div className="md:hidden mt-3">
        <select className="w-full px-3 py-2 border rounded-md" value={tab} onChange={(e)=>setTab(e.target.value)}>
          <option value="capture">Capture</option>
          <option value="scoring">Scoring</option>
          <option value="nurture">Nurturing</option>
          <option value="conversion">Conversion</option>
          <option value="analytics">Analytics</option>
        </select>
      </div>

      <div className="mt-6">
        {tab === 'capture' && (
          <div className="space-y-6">
            <CampaignList />
            <LeadList />
          </div>
        )}
        {tab === 'scoring' && <LeadScoring />}
        {tab === 'nurture' && <LeadNurture />}
        {tab === 'conversion' && <LeadConversion />}
        {tab === 'analytics' && <LeadAnalytics />}
      </div>
    </main>
  )
}
