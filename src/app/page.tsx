'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareCard } from '@/components/tracker/share-card'
import { DeepDive } from '@/components/tracker/deep-dive'
import { WeightsPanel } from '@/components/tracker/weights-panel'
import {
  CategoryScores,
  CategoryWeights,
  EventItem,
  ScoreHistoryPoint,
  computeCategoryScores,
  createDefaultWeights,
  generateIndexSeries,
  weightedIndex,
} from '@/lib/democracy'

/** Client-only live clock text (prevents SSR/client mismatch) */
function useNowText() {
  const [text, setText] = React.useState('')
  const [iso, setIso] = React.useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setIso(d.toISOString())
      setText(d.toLocaleString())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return { text, iso }
}

export default function DemocracyTracker() {
  // Start empty; seed on the client to avoid SSR timing drift
  const [events, setEvents] = useState<EventItem[]>([])
  const [weights, setWeights] = useState<CategoryWeights>(() => createDefaultWeights())
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await fetch('data/events.json')
        if (!response.ok) throw new Error(`Failed to load events: ${response.status}`)
        const payload = await response.json()
        if (cancelled) return
        const incoming: unknown = payload?.events
        if (!Array.isArray(incoming)) {
          setEvents([])
          return
        }

        const normalized = incoming
          .filter((item): item is EventItem => {
            if (typeof item !== 'object' || item === null) return false
            const candidate = item as Record<string, unknown>
            return (
              typeof candidate.id === 'string' &&
              typeof candidate.date === 'string' &&
              typeof candidate.title === 'string' &&
              typeof candidate.category === 'string' &&
              (candidate.direction === 1 || candidate.direction === -1) &&
              typeof candidate.magnitude === 'number' &&
              typeof candidate.confidence === 'number'
            )
          })
          .map(event => ({
            ...event,
            url: event.url && typeof event.url === 'string' ? event.url : undefined,
            summary: event.summary && typeof event.summary === 'string' ? event.summary : undefined,
          }))
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))

        setEvents(normalized)
      } catch (error) {
        console.error('Failed to load static events dataset.', error)
        if (!cancelled) {
          setEvents([])
        }
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  const categoryScores = useMemo<CategoryScores>(() => computeCategoryScores(events), [events])
  const index = useMemo(() => weightedIndex(categoryScores, weights), [categoryScores, weights])

  useEffect(() => {
    const series = generateIndexSeries(events, weights, 90, 60)
    setHistory(series)
  }, [events, weights])

  const cardRef = useRef<HTMLDivElement | null>(null)
  const { text: nowText, iso: nowISO } = useNowText()

  async function handleExport() {
    if (!cardRef.current) return
    const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.download = `democracy-tracker-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
          <div className="text-lg font-semibold">U.S. Democracy Tracker</div>
          {/* Hydration-safe time display */}
          <div className="flex items-center gap-2 text-xs opacity-70">
            <time dateTime={nowISO} suppressHydrationWarning>
              {nowText || '—'}
            </time>
          </div>
          <Button onClick={handleExport} size="sm" className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Export Card
          </Button>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-4">
        <div ref={cardRef} className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
          <ShareCard index={index} history={history} categoryScores={categoryScores} events={events} />
        </div>
      </section>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-10">
        <DeepDive events={events} setEvents={setEvents} categoryScores={categoryScores} />
        <WeightsPanel weights={weights} setWeights={setWeights} />
      </main>
    </div>
  )
}
