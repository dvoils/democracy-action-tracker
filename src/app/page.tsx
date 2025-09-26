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
  getSeedEvents,
  weightedIndex,
} from '@/lib/democracy'

export default function DemocracyTracker() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [weights, setWeights] = useState<CategoryWeights>(() => createDefaultWeights())
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])

  const categoryScores = useMemo<CategoryScores>(() => computeCategoryScores(events), [events])
  const index = useMemo(() => weightedIndex(categoryScores, weights), [categoryScores, weights])

  useEffect(() => {
    setEvents(getSeedEvents())
  }, [])

  useEffect(() => {
    setHistory(previous => [...previous.slice(-199), { ts: Date.now(), value: index }])
  }, [index])

  useEffect(() => {
    const timer = setInterval(() => {
      setHistory(previous => [...previous.slice(-199), { ts: Date.now(), value: index }])
    }, 2000)
    return () => clearInterval(timer)
  }, [index])

  const cardRef = useRef<HTMLDivElement | null>(null)

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
          <div className="flex items-center gap-2 text-xs opacity-70">{new Date().toLocaleString()}</div>
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
