'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { CATEGORY_META, EventItem } from '@/lib/democracy'

export function EventRow({ event, detailed = false }: { event: EventItem; detailed?: boolean }) {
  const Icon = event.direction === 1 ? ArrowUpRight : ArrowDownRight
  const directionLabel = event.direction === 1 ? 'Towards Democracy' : 'Towards Autocracy'
  const impactScore = event.magnitude * event.confidence
  const accentColor = CATEGORY_META[event.category].accentColor

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-colors ${
        event.direction === 1 ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'
      }`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accentColor }}
        layoutId={`${event.category}-accent`}
      />
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="truncate font-medium">{event.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(event.date).toLocaleString()} · {event.category}
            </div>
            {detailed && event.summary && <div className="text-sm text-muted-foreground">{event.summary}</div>}
            {detailed && event.url && (
              <a className="text-sm font-medium text-primary underline" href={event.url} target="_blank" rel="noreferrer">
                Source
              </a>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                event.direction === 1 ? 'border-green-300 bg-green-100/70 text-green-900' : 'border-red-300 bg-red-100/70 text-red-900'
              }`}
            >
              <Icon className="h-3 w-3" />
              {event.direction === 1 ? '+' : '-'}
              {event.magnitude.toFixed(1)} · conf {Math.round(event.confidence * 100)}%
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{directionLabel}</div>
            <div className="text-xs text-muted-foreground">
              Impact score <span className="font-semibold text-foreground">{impactScore.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
