import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/auth'
import { getCampaigns } from '../api/campaign'
import { getDeals } from '../api/deal'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from 'recharts'
import {
  Search,
  X,
  Filter,
  UploadCloud,
  User as UserIcon,
  FolderKanban,
  Globe,
  Sparkles,
  RotateCcw,
  Plus,
  FileText,
  Workflow,
  Kanban,
  TrendingUp,
  Award,
  ArrowUpRight,
  Flame,
  Users,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react'

export default function DashboardHome() {
  const [user, setUser] = useState(null)
  const { user: currentUser, isOps, hasRole } = useCurrentUser()

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'))
    } catch (e) {}
  }, [])

  const canSeeRevenue = useMemo(() => {
    if (!user || !user.role) return false
    const roles = user.role.split(',').map(r => r.trim().toLowerCase())
    return roles.includes('admin') || roles.includes('finance')
  }, [user])

  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [deals, setDeals] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Spotlight Funnel Search & Filter State
  const [funnelSearchQuery, setFunnelSearchQuery] = useState('')
  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Quick preset functions
  const applyPreset = (preset) => {
    const now = new Date()
    const from = new Date()

    switch (preset) {
      case 'today':
        break
      case 'yesterday':
        from.setDate(now.getDate() - 1)
        now.setDate(now.getDate() - 1)
        break
      case '7d':
        from.setDate(now.getDate() - 7)
        break
      case '30d':
        from.setDate(now.getDate() - 30)
        break
      case '3m':
        from.setMonth(now.getMonth() - 3)
        break
      case '6m':
        from.setMonth(now.getMonth() - 6)
        break
      case '1y':
        from.setFullYear(now.getFullYear() - 1)
        break
      default:
        return
    }

    setFromDate(from.toISOString().split('T')[0])
    setToDate(now.toISOString().split('T')[0])
  }

  const clearDates = () => {
    setFromDate('')
    setToDate('')
  }

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append('from', new Date(fromDate).toISOString())
      if (toDate) {
        const endOfDay = new Date(toDate)
        endOfDay.setHours(23, 59, 59, 999)
        params.append('to', endOfDay.toISOString())
      }
      const queryString = params.toString()
      const summaryUrl = queryString ? `/analytics/summary?${queryString}` : '/analytics/summary'

      const [summaryRes, campaignsRes] = await Promise.all([
        api.get(summaryUrl),
        getCampaigns(),
      ])
      setSummary(summaryRes.data?.data || null)
      setCampaigns(campaignsRes.data?.data || [])

      if (isOps || hasRole('sales')) {
        const dealsRes = await getDeals()
        setDeals(dealsRes.data?.data || [])
      } else {
        setDeals([])
      }
    } catch (err) {
      if (import.meta.env.DEV) console.debug('Dashboard fetch error:', err?.response?.status, err?.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [fromDate, toDate])

  // Global Header Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const query = searchQuery.toLowerCase()

    const matchedCampaigns = campaigns
      .filter(c =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.mobile && c.mobile.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
      )
      .map(c => ({ type: 'Lead', ...c }))

    const matchedDeals = deals
      .filter(d =>
        (d.title && d.title.toLowerCase().includes(query)) ||
        (d.contact?.email && d.contact.email.toLowerCase().includes(query)) ||
        (d.contact?.name && d.contact.name.toLowerCase().includes(query))
      )
      .map(d => ({ type: 'Deal', ...d }))

    setSearchResults([...matchedCampaigns, ...matchedDeals])
  }, [searchQuery, campaigns, deals])

  // Compute smart suggestions for Funnel & Pipeline Spotlight Search
  const funnelSuggestions = useMemo(() => {
    const query = funnelSearchQuery.trim().toLowerCase()

    // Extract unique uploaders
    const uploaderMap = new Map()
    campaigns.forEach(c => {
      const uploader = c.uploadedByName || c.uploadedBy?.name || c.owner?.name || (c.uploadedById ? `User #${c.uploadedById}` : 'System Admin')
      if (uploader) {
        const existing = uploaderMap.get(uploader) || { name: uploader, campaignCount: 0, leadsCount: 0 }
        existing.campaignCount += 1
        existing.leadsCount += Number(c.leadsGenerated || 0)
        uploaderMap.set(uploader, existing)
      }
    })
    const uploaders = Array.from(uploaderMap.values())

    // Extract unique channels / sources
    const channelMap = new Map()
    campaigns.forEach(c => {
      const src = c.channel || c.utmSource
      if (src) {
        channelMap.set(src, (channelMap.get(src) || 0) + 1)
      }
    })
    const sources = Array.from(channelMap.entries()).map(([name, count]) => ({ name, count }))

    // Extract unique sales assignees / owners
    const assigneeMap = new Map()
    deals.forEach(d => {
      const repName = d.owner?.name || (d.assignedTo ? `Rep #${d.assignedTo}` : null)
      if (repName) {
        assigneeMap.set(repName, (assigneeMap.get(repName) || 0) + 1)
      }
    })
    const assignees = Array.from(assigneeMap.entries()).map(([name, count]) => ({ name, count }))

    // Filter campaigns by query
    const matchedCampaigns = campaigns
      .filter(c => {
        if (!query) return true
        const nameMatch = (c.name || '').toLowerCase().includes(query)
        const uploaderMatch = (c.uploadedByName || c.uploadedBy?.name || c.owner?.name || '').toLowerCase().includes(query)
        const channelMatch = (c.channel || c.utmSource || '').toLowerCase().includes(query)
        return nameMatch || uploaderMatch || channelMatch
      })
      .slice(0, 5)
      .map(c => ({
        type: 'campaign',
        id: c.id,
        name: c.name,
        channel: c.channel || c.utmSource || 'Web Campaign',
        uploaderName: c.uploadedByName || c.uploadedBy?.name || c.owner?.name || 'System Admin',
        leadsCount: c.leadsGenerated || 0,
        status: c.status || 'Active'
      }))

    const matchedUploaders = uploaders
      .filter(u => {
        if (!query) return true
        return u.name.toLowerCase().includes(query)
      })
      .slice(0, 3)

    const matchedSources = sources
      .filter(s => {
        if (!query) return true
        return s.name.toLowerCase().includes(query)
      })
      .slice(0, 3)

    const matchedAssignees = assignees
      .filter(a => {
        if (!query) return true
        return a.name.toLowerCase().includes(query)
      })
      .slice(0, 3)

    const totalMatches = matchedCampaigns.length + matchedUploaders.length + matchedSources.length + matchedAssignees.length

    return {
      campaigns: matchedCampaigns,
      uploaders: matchedUploaders,
      sources: matchedSources,
      assignees: matchedAssignees,
      totalMatches
    }
  }, [campaigns, deals, funnelSearchQuery])

  // Compute filtered Lead Funnel & Sales Pipeline data
  const filteredFunnelData = useMemo(() => {
    if (!selectedFunnelFilter && !funnelSearchQuery.trim()) {
      const leadFunnel = (summary?.funnel?.leadFunnel || []).map(x => ({ name: x.status, count: x.count }))
      const pipeline = (summary?.sales?.pipelineOverview || []).map(x => ({ name: x.stage, count: x.count }))
      return {
        leadFunnel,
        pipeline,
        isFiltered: false,
        activeFilterInfo: null,
        totalLeads: summary?.kpis?.totalLeads ?? 0,
        totalDeals: deals.length,
        matchedCampaignsCount: campaigns.length,
        matchedDealsCount: deals.length
      }
    }

    const query = funnelSearchQuery.trim().toLowerCase()
    let matchedCamps = [...campaigns]
    let matchedDeals = [...deals]
    let activeFilterInfo = null

    if (selectedFunnelFilter) {
      if (selectedFunnelFilter.type === 'campaign') {
        matchedCamps = campaigns.filter(c => c.id === selectedFunnelFilter.id || c.name === selectedFunnelFilter.name)
        matchedDeals = deals.filter(d => (d.title || '').toLowerCase().includes(selectedFunnelFilter.name.toLowerCase()))
        activeFilterInfo = {
          typeLabel: 'Campaign',
          label: selectedFunnelFilter.name,
          uploader: selectedFunnelFilter.uploaderName
        }
      } else if (selectedFunnelFilter.type === 'uploader') {
        const uName = selectedFunnelFilter.name.toLowerCase()
        matchedCamps = campaigns.filter(c => (c.uploadedByName || c.uploadedBy?.name || c.owner?.name || '').toLowerCase() === uName)
        matchedDeals = deals.filter(d => (d.owner?.name || '').toLowerCase() === uName)
        activeFilterInfo = {
          typeLabel: 'Uploader',
          label: selectedFunnelFilter.name,
          uploader: selectedFunnelFilter.name
        }
      } else if (selectedFunnelFilter.type === 'source') {
        const src = selectedFunnelFilter.name.toLowerCase()
        matchedCamps = campaigns.filter(c => (c.channel || c.utmSource || '').toLowerCase() === src)
        matchedDeals = deals.filter(d => (d.contact?.company || d.title || '').toLowerCase().includes(src))
        activeFilterInfo = {
          typeLabel: 'Source / Channel',
          label: selectedFunnelFilter.name,
          uploader: matchedCamps[0]?.uploadedByName || matchedCamps[0]?.uploadedBy?.name || null
        }
      } else if (selectedFunnelFilter.type === 'assignee') {
        const rep = selectedFunnelFilter.name.toLowerCase()
        matchedDeals = deals.filter(d => (d.owner?.name || '').toLowerCase() === rep)
        activeFilterInfo = {
          typeLabel: 'Sales Assignee',
          label: selectedFunnelFilter.name,
          uploader: null
        }
      }
    } else if (query) {
      matchedCamps = campaigns.filter(c =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.uploadedByName || c.uploadedBy?.name || c.owner?.name || '').toLowerCase().includes(query) ||
        (c.channel || c.utmSource || '').toLowerCase().includes(query)
      )
      matchedDeals = deals.filter(d =>
        (d.title || '').toLowerCase().includes(query) ||
        (d.contact?.name || d.contact?.email || d.contact?.company || '').toLowerCase().includes(query) ||
        (d.owner?.name || '').toLowerCase().includes(query)
      )
      const firstCampUploader = matchedCamps[0]?.uploadedByName || matchedCamps[0]?.uploadedBy?.name
      activeFilterInfo = {
        typeLabel: 'Search',
        label: `"${funnelSearchQuery}"`,
        uploader: firstCampUploader || null
      }
    }

    const stageToPipeline = (stage) => {
      if (stage === 'Negotiation') return 'In Progress'
      if (stage === 'Proposal Sent') return 'Proposal'
      if (stage === 'Closed Won') return 'Deal Completed'
      if (stage === 'Closed Lost' || stage === 'Lost Opportunity') return 'Lost Opportunity'
      return 'New'
    }

    const wonDealsCount = matchedDeals.filter(d => d.stage === 'Closed Won').length
    const inProgressCount = matchedDeals.filter(d => d.stage === 'Negotiation' || d.stage === 'Proposal Sent').length
    const lostDealsCount = matchedDeals.filter(d => d.stage === 'Closed Lost' || d.stage === 'Lost Opportunity').length
    const newDealsCount = matchedDeals.filter(d => d.stage === 'New' || !d.stage).length

    const leadFunnel = [
      { name: 'New', count: newDealsCount || (matchedCamps.length ? matchedCamps.length * 4 : 0) },
      { name: 'Contacted', count: inProgressCount || (matchedCamps.length ? Math.floor(matchedCamps.length * 2.5) : 0) },
      { name: 'Qualified', count: Math.max(0, Math.floor((inProgressCount + wonDealsCount) * 0.8)) || (matchedCamps.length ? Math.floor(matchedCamps.length * 1.8) : 0) },
      { name: 'Converted', count: wonDealsCount || (matchedCamps.length ? Math.floor(matchedCamps.length * 1.2) : 0) },
      { name: 'Lost', count: lostDealsCount }
    ]

    const pipelineStages = ['New', 'In Progress', 'Proposal', 'Deal Completed', 'Lost Opportunity']
    const pipeline = pipelineStages.map(stage => ({
      stage,
      count: matchedDeals.filter(d => stageToPipeline(d.stage) === stage).length
    }))

    const totalLeadsCount = matchedCamps.reduce((sum, c) => sum + Number(c.leadsGenerated || 0), 0) + matchedDeals.length

    return {
      leadFunnel,
      pipeline,
      isFiltered: true,
      activeFilterInfo,
      totalLeads: totalLeadsCount,
      totalDeals: matchedDeals.length,
      matchedCampaignsCount: matchedCamps.length,
      matchedDealsCount: matchedDeals.length
    }
  }, [summary, deals, campaigns, selectedFunnelFilter, funnelSearchQuery])

  const leadFunnelData = filteredFunnelData.leadFunnel
  const pipelineData = filteredFunnelData.pipeline

  const handleSelectFilter = (filterItem) => {
    setSelectedFunnelFilter(filterItem)
    setFunnelSearchQuery(filterItem.name)
    setIsSearchOpen(false)
  }

  const handleResetFilter = () => {
    setSelectedFunnelFilter(null)
    setFunnelSearchQuery('')
    setIsSearchOpen(false)
  }

  const captureStats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'Active').length
    const total = campaigns.length
    const newLeads = leadFunnelData.find(f => f.name === 'New')?.count ?? 0
    return { active, total, newLeads }
  }, [campaigns, leadFunnelData])

  const scoringStats = useMemo(() => {
    const hotDeals = deals.filter(d => d.isHot).length
    const avgScore = deals.length
      ? Math.round(deals.reduce((sum, d) => sum + (typeof d.score === 'number' ? d.score : 0), 0) / deals.length)
      : 0
    const gradeCounts = ['A', 'B', 'C'].map(grade => ({
      grade,
      count: deals.filter(d => d.grade === grade).length,
    }))
    const ungraded = deals.filter(d => !d.grade).length
    if (ungraded) gradeCounts.push({ grade: 'Unscored', count: ungraded })
    return { hotDeals, avgScore, gradeCounts }
  }, [deals])

  const leadStats = useMemo(() => ({
    total: summary?.kpis?.totalLeads ?? 0,
    hotLeads: summary?.kpis?.hotLeads ?? 0,
    conversionRate: summary?.kpis?.conversionRate ?? 0,
  }), [summary])

  const salesStats = useMemo(() => {
    const wonCount = pipelineData.find(p => p.name === 'Won' || p.stage === 'Deal Completed')?.count ?? 0
    const inProgress = pipelineData.find(p => p.name === 'In Progress' || p.stage === 'In Progress')?.count ?? 0
    const revenueWon = summary?.kpis?.revenueWon ?? 0
    return { wonCount, inProgress, revenueWon }
  }, [pipelineData, summary])

  const topCampaigns = useMemo(() => summary?.campaigns?.topCampaignsByLeads || [], [summary])
  const mostLeads = useMemo(() => topCampaigns.reduce((max, item) => Math.max(max, item.count), 0) || 1, [topCampaigns])
  const teamPerformance = useMemo(() => summary?.sales?.leadsPerSalesperson || [], [summary])
  const topSalesperson = summary?.sales?.topSalespersonByDeals || null
  const sequencesPerSalesperson = useMemo(() => summary?.sales?.sequencesPerSalesperson || [], [summary])

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50/60 p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900 selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Hero Control Center Section */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 p-6 sm:p-10 text-white shadow-xl shadow-slate-950/10 border border-slate-800/70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-emerald-500/10 to-transparent pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Control Center
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
                  Customer Growth <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">Command Hub</span>
                </h1>
                <p className="mt-2.5 max-w-2xl text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
                  Real-time visibility across lead capture velocity, scoring heuristics, and sales closing momentum.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchSummary}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm ${
                    loading 
                      ? 'cursor-not-allowed bg-white/5 text-white/50' 
                      : 'bg-white/10 text-white hover:bg-white/20 hover:border-white/30 backdrop-blur-md active:scale-98'
                  }`}
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Refreshing…' : 'Refresh Snapshot'}</span>
                </button>
              </div>
            </div>

            {/* Global Lead Search Bar */}
            <div className="mt-8">
              <div className="relative max-w-lg">
                <input
                  type="text"
                  placeholder="Search leads across all teams by mobile, email, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-11 pr-10 text-sm text-white placeholder-slate-400 backdrop-blur-md transition-all duration-200 focus:bg-white/15 focus:border-indigo-400/80 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Global Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute z-50 mt-2 w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium">No matching leads or deals found</div>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto space-y-1 divide-y divide-slate-100">
                      {searchResults.map((item, idx) => (
                        <li key={idx} className="pt-1 first:pt-0">
                          <div
                            className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                            onClick={() => {
                              if (item.type === 'Lead') {
                                navigate(`/dashboard/marketing?expandId=${item.id}`)
                              } else if (item.type === 'Deal') {
                                navigate(`/dashboard/sales/deals/${item.id}`)
                              }
                              setSearchQuery('')
                            }}
                          >
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{item.name || item.title}</div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5">
                                <span className={`inline-block mr-1.5 px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase ${
                                  item.type === 'Lead' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {item.type}
                                </span>
                                {item.mobile || item.email || item.contact?.email || 'No contact info'}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                              {item.status || item.stage}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* KPI Summary Strip */}
            <div className="mt-8 border-t border-white/10 pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capture Velocity</span>
                  <FolderKanban className="h-4 w-4 text-emerald-400/80" />
                </div>
                <div className="mt-2 text-3xl font-mono font-bold tracking-tight text-white">
                  {captureStats.active}<span className="text-slate-500 text-lg font-normal">/{captureStats.total}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Active campaigns</span>
                  <span className="font-semibold text-emerald-400">+{captureStats.newLeads} new</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Deal Scoring</span>
                  <Flame className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-2 text-3xl font-mono font-bold tracking-tight text-white">
                  {scoringStats.hotDeals}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Hot opportunities</span>
                  <span className="font-semibold text-amber-400">Avg score {scoringStats.avgScore}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
                  <Users className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="mt-2 text-3xl font-mono font-bold tracking-tight text-white">
                  {leadStats.total}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Captured</span>
                  <span className="font-semibold text-indigo-400">{leadStats.conversionRate}% conv.</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Closed Revenue</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-3xl font-mono font-bold tracking-tight text-emerald-400">
                  {canSeeRevenue ? `₹${Number(salesStats.revenueWon || 0).toLocaleString()}` : '₹ ••••'}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Won: {salesStats.wonCount}</span>
                  <span className="font-semibold text-slate-300">{salesStats.inProgress} in progress</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Action Navigation Strip */}
        <section className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/sales/deals/new')}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300 hover:text-emerald-800 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span>New Deal</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/finance/invoice-generator')}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-indigo-50/50 hover:border-indigo-300 hover:text-indigo-800 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200 transition-colors">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/marketing-team/sequences/new')}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-purple-50/50 hover:border-purple-300 hover:text-purple-800 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200 transition-colors">
              <Workflow className="h-3.5 w-3.5" />
            </div>
            <span>New Sequence</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/sales')}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 ml-auto"
          >
            <Kanban className="h-4 w-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
            <span>Interactive Pipeline View</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </section>

        {/* Funnel & Pipeline Health Section with Spotlight Search */}
        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow xl:col-span-2">
            <div className="flex flex-col gap-5">
              
              {/* Header with Spotlight Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Funnel & Pipeline Health</h2>
                    {filteredFunnelData.isFiltered && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-[11px] font-bold tracking-wide uppercase text-indigo-700 border border-indigo-200/70 shadow-2xs">
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                        Filtered
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Live capture → qualification → close metrics</span>
                </div>

                {/* Spotlight Search Command Input */}
                <div ref={searchContainerRef} className="relative w-full sm:w-84">
                  <div className={`relative flex items-center rounded-2xl border transition-all duration-200 ${
                    isSearchOpen || funnelSearchQuery || selectedFunnelFilter 
                      ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/15 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-white'
                  }`}>
                    <Search className="ml-3.5 h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Filter by Campaign, Uploader, Source..."
                      value={funnelSearchQuery}
                      onChange={(e) => {
                        setFunnelSearchQuery(e.target.value)
                        setSelectedFunnelFilter(null)
                        setIsSearchOpen(true)
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      className="w-full bg-transparent px-3 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {(funnelSearchQuery || selectedFunnelFilter) && (
                      <button
                        onClick={handleResetFilter}
                        className="mr-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Clear filter"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestion Popover */}
                  {isSearchOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-full sm:w-96 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-96 overflow-y-auto divide-y divide-slate-100">
                      
                      {/* Matching Campaigns with Uploader Details */}
                      {funnelSuggestions.campaigns.length > 0 && (
                        <div className="pb-2.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span>Campaigns & Uploaders</span>
                          </div>
                          <div className="mt-1 space-y-1">
                            {funnelSuggestions.campaigns.map((camp) => (
                              <button
                                key={camp.id}
                                onClick={() => handleSelectFilter(camp)}
                                className="w-full text-left rounded-xl p-2 hover:bg-indigo-50/70 transition-colors group flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900 line-clamp-1">
                                    {camp.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 font-semibold">
                                    {camp.channel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md font-medium text-[10px]">
                                    <UploadCloud className="h-3 w-3 text-amber-600" />
                                    Uploaded by: <strong className="font-semibold text-amber-950">{camp.uploaderName}</strong>
                                  </span>
                                  {camp.leadsCount > 0 && (
                                    <span className="text-slate-400 text-[10px] font-medium">• {camp.leadsCount} leads</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filter by Uploader Person */}
                      {funnelSuggestions.uploaders.length > 0 && (
                        <div className="py-2.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            <UploadCloud className="h-3.5 w-3.5 text-amber-600" />
                            <span>Filter by Uploader</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                            {funnelSuggestions.uploaders.map((uploader) => (
                              <button
                                key={uploader.name}
                                onClick={() => handleSelectFilter({ type: 'uploader', name: uploader.name })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-2xs"
                              >
                                <UploadCloud className="h-3 w-3 text-amber-600" />
                                <span>{uploader.name}</span>
                                <span className="rounded-full bg-amber-200/70 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                                  {uploader.campaignCount}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filter by Source / Channel */}
                      {funnelSuggestions.sources.length > 0 && (
                        <div className="py-2.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            <Globe className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Filter by Source</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                            {funnelSuggestions.sources.map((src) => (
                              <button
                                key={src.name}
                                onClick={() => handleSelectFilter({ type: 'source', name: src.name })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-2xs"
                              >
                                <span>{src.name}</span>
                                <span className="rounded-full bg-emerald-200/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                                  {src.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filter by Sales Rep / Assignee */}
                      {funnelSuggestions.assignees.length > 0 && (
                        <div className="pt-2.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                            <UserIcon className="h-3.5 w-3.5 text-purple-600" />
                            <span>Filter by Sales Rep</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                            {funnelSuggestions.assignees.map((rep) => (
                              <button
                                key={rep.name}
                                onClick={() => handleSelectFilter({ type: 'assignee', name: rep.name })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-purple-50/70 px-2.5 py-1 text-xs font-medium text-purple-900 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-2xs"
                              >
                                <span>{rep.name}</span>
                                <span className="rounded-full bg-purple-200/70 px-1.5 py-0.2 text-[10px] font-bold text-purple-900">
                                  {rep.count} deals
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {funnelSuggestions.totalMatches === 0 && (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          No matching campaigns, uploaders, or sources found for "{funnelSearchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Filter Notification Banner */}
              {filteredFunnelData.activeFilterInfo && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-amber-50/60 p-3.5 text-xs text-indigo-950 shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-900">
                      <Filter className="h-3.5 w-3.5 text-indigo-600" />
                      {filteredFunnelData.activeFilterInfo.typeLabel}:
                    </span>
                    <span className="font-bold text-indigo-700 bg-white border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                      {filteredFunnelData.activeFilterInfo.label}
                    </span>
                    {filteredFunnelData.activeFilterInfo.uploader && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 rounded-lg font-medium">
                        <UploadCloud className="h-3.5 w-3.5 text-amber-600" />
                        Uploaded by: <strong className="font-bold">{filteredFunnelData.activeFilterInfo.uploader}</strong>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({filteredFunnelData.matchedCampaignsCount || 0} campaigns • {filteredFunnelData.matchedDealsCount || 0} deals)
                    </span>
                  </div>
                  <button
                    onClick={handleResetFilter}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-2xs"
                  >
                    <RotateCcw className="h-3 w-3 text-slate-500" />
                    Reset Filter
                  </button>
                </div>
              )}

              {/* Date Range Filter Strip */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <button
                    onClick={clearDates}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
                  >
                    Clear Dates
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Quick:</span>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: '7d', label: '7 Days' },
                    { key: '30d', label: '30 Days' },
                    { key: '3m', label: '3 Months' },
                    { key: '6m', label: '6 Months' },
                    { key: '1y', label: '1 Year' }
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => applyPreset(preset.key)}
                      className="rounded-lg bg-white border border-slate-200/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Funnel & Sales Pipeline BarCharts */}
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800">Lead Funnel</h3>
                    <span className="text-[11px] font-medium text-slate-400">Leads by status</span>
                  </div>
                  <div className="min-h-[250px] rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col justify-center">
                    {loading ? (
                      <div className="text-center text-xs text-slate-400 py-12 font-medium">Loading funnel metrics…</div>
                    ) : leadFunnelData.every(x => x.count === 0) && filteredFunnelData.isFiltered ? (
                      <div className="text-center py-8 px-4">
                        <FolderKanban className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No leads in funnel for this filter</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try selecting another campaign or uploader</p>
                        <button
                          onClick={handleResetFilter}
                          className="mt-3 inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline"
                        >
                          Reset Filter
                        </button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={leadFunnelData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                          <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                            {leadFunnelData.map((entry, index) => {
                              let color = '#6366f1'
                              const status = (entry.name || '').toLowerCase()
                              if (status.includes('new')) color = '#3b82f6'
                              else if (status.includes('contact')) color = '#f59e0b'
                              else if (status.includes('convert') || status.includes('won')) color = '#10b981'
                              else if (status.includes('lost')) color = '#ef4444'
                              return <Cell key={`cell-${index}`} fill={color} />
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800">Sales Pipeline</h3>
                    <span className="text-[11px] font-medium text-slate-400">Deals by stage</span>
                  </div>
                  <div className="min-h-[250px] rounded-2xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col justify-center">
                    {loading ? (
                      <div className="text-center text-xs text-slate-400 py-12 font-medium">Loading pipeline metrics…</div>
                    ) : pipelineData.every(x => x.count === 0) && filteredFunnelData.isFiltered ? (
                      <div className="text-center py-8 px-4">
                        <TrendingUp className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No active deals in pipeline for this filter</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try searching by another representative or uploader</p>
                        <button
                          onClick={handleResetFilter}
                          className="mt-3 inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline"
                        >
                          Reset Filter
                        </button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={pipelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            cursor={{ fill: 'rgba(16,185,129,0.04)' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                          <Bar dataKey="count" name="Deals" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Snapshot Card */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Scoring Snapshot</h2>
                  <span className="text-[11px] font-medium text-slate-400">Deal qualification & prioritisation</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Flame className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-5 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Hot Deals Waiting</div>
                  <div className="mt-2 text-3xl font-mono font-bold text-indigo-950">{scoringStats.hotDeals}</div>
                  <p className="mt-1 text-xs font-medium text-indigo-700/80">Average lead score: {scoringStats.avgScore}/100</p>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Grade Distribution</div>
                  <ul className="space-y-2">
                    {scoringStats.gradeCounts.map(item => (
                      <li key={item.grade} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            item.grade === 'A' ? 'bg-emerald-500' : item.grade === 'B' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <span className="font-semibold text-slate-800">Grade {item.grade}</span>
                        </div>
                        <span className="font-bold text-slate-600 bg-white border border-slate-200/60 px-2 py-0.5 rounded-lg shadow-2xs">
                          {item.count} deals
                        </span>
                      </li>
                    ))}
                    {!scoringStats.gradeCounts.length && (
                      <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 font-medium">
                        No scored deals yet
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/sales')}
              className="mt-6 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
            >
              <span>Explore All Deals</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Member Performance Section */}
        <section>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Member Performance</h2>
                <span className="text-xs font-medium text-slate-500">Assigned Leads vs. Deals currently in progress</span>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Assigned
                </span>
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Working On
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              {loading ? (
                <div className="text-center text-xs text-slate-400 py-12 font-medium">Loading performance metrics…</div>
              ) : !teamPerformance.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 font-medium">
                  No sales representatives active
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <ResponsiveContainer width="100%" height={Math.max(240, teamPerformance.length * 60)}>
                    <BarChart data={teamPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="leads" name="Assigned Leads" fill="#94a3b8" radius={[0, 6, 6, 0]} barSize={14} />
                      <Bar dataKey="workingOn" name="Working On" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sequences by Salesperson Section */}
        <section>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Sequences by Salesperson</h2>
                <span className="text-xs font-medium text-slate-500">Active email cadence & drip sequences per team member</span>
              </div>
              <Workflow className="h-5 w-5 text-indigo-500" />
            </div>
            
            <div className="mt-6">
              {loading ? (
                <div className="text-center text-xs text-slate-400 py-8 font-medium">Loading active sequences…</div>
              ) : !sequencesPerSalesperson.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 font-medium">
                  No active sequences currently running
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sequencesPerSalesperson.map(sp => (
                    <div key={sp.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 hover:border-indigo-200 transition-colors shadow-2xs">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 shadow-2xs">
                            {sp.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{sp.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{sp.totalActiveEnrollments} active enrollment{sp.totalActiveEnrollments !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          {sp.sequences.length} seq.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                        {sp.sequences.map(seq => (
                          <div
                            key={seq.sequenceId}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px]"
                          >
                            <span className="font-semibold text-slate-700">{seq.sequenceName}</span>
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                              {seq.activeLeads}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3-Column Highlights Grid */}
        <section className="grid gap-6 lg:grid-cols-3">
          
          {/* Capture Momentum Card */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Capture Momentum</h2>
                <span className="text-[11px] font-medium text-slate-400">Top campaigns generating volume</span>
              </div>
              <FolderKanban className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="text-center text-xs text-slate-400 py-8 font-medium">Loading campaigns…</div>
              ) : !topCampaigns.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 font-medium">
                  No campaigns with leads yet
                </div>
              ) : topCampaigns.map(c => (
                <div key={c.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="line-clamp-1">{c.name}</span>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80 shrink-0">
                      {c.count} leads
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${Math.max(8, (c.count / mostLeads) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Closer Highlights Card */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Sales Leadership</h2>
                <span className="text-[11px] font-medium text-slate-400">Closing performance & won value</span>
              </div>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Top Closer Highlight</div>
                {topSalesperson ? (
                  <div className="mt-2">
                    <div className="text-base font-bold text-emerald-950">{topSalesperson.name}</div>
                    <div className="text-xs font-semibold text-emerald-800/90 mt-1">
                      {topSalesperson.won} won deals • {topSalesperson.deals} total managed
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-700/80 font-medium">No closed deals yet</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Won Revenue</div>
                <div className="mt-1.5 text-2xl font-mono font-bold text-slate-900">
                  {canSeeRevenue ? `₹${Number(salesStats.revenueWon || 0).toLocaleString()}` : '₹ ••••'}
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">Closed in the active snapshot window</p>
              </div>
            </div>
          </div>

          {/* Team Focus Card */}
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Team Allocation</h2>
                <span className="text-[11px] font-medium text-slate-400">Lead distribution overview</span>
              </div>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="text-center text-xs text-slate-400 py-8 font-medium">Loading distribution…</div>
              ) : !teamPerformance.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 font-medium">
                  No team members assigned
                </div>
              ) : teamPerformance.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/dashboard/team/${item.id}`)}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-4 cursor-pointer transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="group-hover:text-indigo-900 transition-colors">{item.name}</span>
                    <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200/70 px-2 py-0.5 rounded-md shadow-2xs">
                      {item.leads} leads
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200/60">
                    <div
                      className="h-full rounded-full bg-slate-500 group-hover:bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${teamPerformance.length ? Math.max(6, (item.leads / Math.max(...teamPerformance.map(x => x.leads || 1))) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
