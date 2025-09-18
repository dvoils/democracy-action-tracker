'use client';

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import {
  CATEGORIES,
  CATEGORY_META,
  CategoryScores,
  EventItem,
  ScoreHistoryPoint,
  computeEventStats,
} from '@/lib/democracy'
import { EventRow } from './event-row'

type ShareCardProps = {
  index: number
  history: ScoreHistoryPoint[]
  categoryScores: CategoryScores
  events: EventItem[]
}

export function ShareCard({ index, history, categoryScores, events }: ShareCardProps) {
  const stats = useMemo(() => computeEventStats(events), [events])
  const historyData = history.map(point => ({
    t: new Date(point.ts).toLocaleTimeString(),
    v: point.value,
  }))

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="space-y-4 md:col-span-3">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold md:text-3xl">Today’s Index: {index.toFixed(1)}</h1>
          <div className="relative h-16 overflow-hidden rounded-2xl bg-gray-100">
            <div className="absolute inset-0 flex">
              <div className="h-full w-1/2 bg-red-50" />
              <div className="h-full w-1/2 bg-green-50" />
            </div>
            <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
            <motion.div
              className="absolute top-0 h-full w-1.5 rounded bg-foreground"
              initial={{ x: '50%' }}
              animate={{ x: `${50 + index / 2}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
              <span>-100 Autocracy</span>
              <span>0</span>
              <span>+100 Democracy</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border bg-muted/40 p-4 text-sm md:grid-cols-3">
          <StatBlock label="Total events" value={stats.total.toString()} />
          <StatBlock
            label="Net impact"
            value={`${stats.netImpact >= 0 ? '+' : ''}${stats.netImpact.toFixed(2)}`}
            tone={stats.netImpact >= 0 ? 'positive' : 'negative'}
          />
          <StatBlock
            label="Avg. confidence"
            value={`${Math.round(stats.averageConfidence * 100)}%`}
          />
          <StatBlock label="Positive" value={stats.positive.toString()} tone="positive" />
          <StatBlock label="Negative" value={stats.negative.toString()} tone="negative" />
          <StatBlock
            label="Last update"
            value={stats.latestEventDate ? new Date(stats.latestEventDate).toLocaleString() : '—'}
          />
        </div>

        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 8, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[-100, 100]} hide />
              <Tooltip
                formatter={(value: number | string) =>
                  typeof value === 'number' ? value.toFixed(1) : value
                }
              />
              <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} stroke="#111827" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4 md:col-span-2">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Category Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(category => (
              <div key={category} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{category}</span>
                  <span className="font-medium">{categoryScores[category].toFixed(0)}</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="absolute inset-0 flex">
                    <div className="h-full w-1/2 bg-red-50" />
                    <div className="h-full w-1/2 bg-green-50" />
                  </div>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
                  <motion.div
                    className="absolute top-0 h-full"
                    style={{ backgroundColor: CATEGORY_META[category].accentColor, width: '3%' }}
                    initial={{ x: '50%' }}
                    animate={{ x: `${50 + categoryScores[category] / 2}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Today’s Moves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.slice(0, 3).map(event => (
              <EventRow key={event.id} event={event} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}) {
  const toneClasses =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-rose-600'
        : 'text-foreground'

  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${toneClasses}`}>{value}</div>
    </div>
  )
}
