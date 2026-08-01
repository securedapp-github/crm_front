import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = {
  productive: '#10b981', // emerald-500
  neutral: '#94a3b8',    // slate-400
  unproductive: '#f59e0b',// amber-500
  blocked: '#ef4444'     // red-500
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

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="h-48 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [`${val} hrs`, 'Time Spent']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No activity data recorded
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{score}%</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  )
}
