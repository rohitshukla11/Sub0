'use client'

interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const COLOR_CLASSES = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
}

export function StatsCard({ title, value, icon, color, trend }: StatsCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-lg ${COLOR_CLASSES[color]} flex items-center justify-center text-lg`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1 text-xs ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
