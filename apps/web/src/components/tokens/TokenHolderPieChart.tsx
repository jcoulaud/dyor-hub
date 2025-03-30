'use client'

import React, { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts'

const truncateAddress = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr

const formatPercentage = (val: number) => val.toFixed(2)

const COLORS = [
  '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
  '#1E3A8A', '#1E2E6E', '#172554', '#0F172A', '#0B1120',
]

type TokenHolder = {
  address: string
  percentage: number
}

type Props = {
  topHolders: TokenHolder[]
}

const TopHoldersPieChart: React.FC<Props> = ({ topHolders }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (!topHolders || topHolders.length === 0) return null

  const totalTop = topHolders.reduce((sum, h) => sum + h.percentage, 0)
  const othersPercentage = Math.max(0, 100 - totalTop)
  const data = [...topHolders, { address: 'Others', percentage: othersPercentage }]

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(null)
  }

  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, midAngle,
    } = props

    const RADIAN = Math.PI / 180
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)
    const sx = cx + (outerRadius + 5) * cos
    const sy = cy + (outerRadius + 5) * sin

    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 5} // explode on hover
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#1f2937"
        strokeWidth={2}
      />
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="percentage"
            nameKey="address"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={100}
            label={false}
            stroke="#01010b"
            strokeWidth={2}
            activeIndex={activeIndex ?? undefined}
            activeShape={renderActiveShape}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.address === 'Others'
                    ? '#040404'
                    : COLORS[index % COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  const isOthers = data.address === 'Others'
                  const percentage = formatPercentage(data.percentage)
            
                  return (
                    <div className="bg-zinc-800 text-white text-xs px-2 py-1 rounded shadow-sm">
                      {isOthers ? `Others: ${percentage}%` : `${percentage}%`}
                    </div>
                  )
                }
                return null
              }}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              padding: 8,
              color: '#fff',
            }}
            formatter={(value: number) => `${formatPercentage(value)}%`}
            labelFormatter={(label: string) =>
              label === 'Others' ? 'Others' : truncateAddress(label)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TopHoldersPieChart
