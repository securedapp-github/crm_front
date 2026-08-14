import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = {
  productive: '#10b981',   // emerald-500
  neutral: '#94a3b8',      // slate-400
  unproductive: '#f59e0b', // amber-500
  blocked: '#ef4444'       // red-500
}

export default function ProductivityGauge({
  score = 0,
  productiveHours = 0,
  neutralHours = 0,
  unproductiveHours = 0,
  blockedHours = 0
}) {
  const data = [
    { name: 'Productive', value: Number(productiveHours) || 0, color: COLORS.productive },
    { name: 'Neutral', value: Number(neutralHours) || 0, color: COLORS.neutral },
    { name: 'Unproductive', value: Number(unproductiveHours) || 0, color: COLORS.unproductive },
    { name: 'Blocked', value: Number(blockedHours) || 0, color: COLORS.blocked }
  ].filter(item => item.value > 0)

  const hasData = data.length > 0
  const emptyData = [{ name: 'Empty', value: 1, color: '#f1f5f9' }]

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Gauge Donut Container */}
      <div className="relative h-44 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : emptyData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={72}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              stroke="none"
            >
              {(hasData ? data : emptyData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                formatter={(val) => [`${val} hrs`, 'Time Spent']}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  fontSize: '11px',
                  padding: '6px 10px'
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text Badge inside donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-slate-800 tracking-tight">{score}%</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score</span>
        </div>
      </div>

      {/* Legend / Status indicator below chart */}
      <div className="w-full mt-2 pt-3 border-t border-slate-100">
        {hasData ? (
          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Prod: <strong className="font-mono text-slate-800">{productiveHours}h</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span>Neut: <strong className="font-mono text-slate-800">{neutralHours}h</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>Unprod: <strong className="font-mono text-slate-800">{unproductiveHours}h</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>Block: <strong className="font-mono text-slate-800">{blockedHours}h</strong></span>
            </div>
          </div>
        ) : (
          <p className="text-center text-[11px] text-slate-400 font-medium">
            No activity logs recorded for this period
          </p>
        )}
      </div>
    </div>
  )
}
