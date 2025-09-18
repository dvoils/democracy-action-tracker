'use client';

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import {
  CATEGORIES,
  CATEGORY_META,
  Category,
  CategoryScores,
  EventItem,
  computeEventStats,
  exampleImportPayload,
} from '@/lib/democracy'
import { Gauge } from './gauge'
import { EventRow } from './event-row'

type DeepDiveProps = {
  events: EventItem[]
  setEvents: React.Dispatch<React.SetStateAction<EventItem[]>>
  categoryScores: CategoryScores
}

type EventDraft = Pick<EventItem, 'title' | 'category' | 'direction' | 'magnitude' | 'confidence' | 'url'>

type DirectionFilter = 'all' | 'positive' | 'negative'

type CategoryFilter = Category | 'All'

export function DeepDive({ events, setEvents, categoryScores }: DeepDiveProps) {
  const [draft, setDraft] = useState<EventDraft>({
    title: '',
    category: 'Legislative',
    direction: 1,
    magnitude: 1,
    confidence: 0.8,
    url: '',
  })
  const [importText, setImportText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All')
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (categoryFilter !== 'All' && event.category !== categoryFilter) return false
      if (directionFilter === 'positive' && event.direction !== 1) return false
      if (directionFilter === 'negative' && event.direction !== -1) return false
      if (search && !`${event.title} ${event.summary ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [events, categoryFilter, directionFilter, search])

  const filteredStats = useMemo(() => computeEventStats(filteredEvents), [filteredEvents])

  function addEvent(partial: Partial<EventDraft>) {
    const event: EventItem = {
      id: `evt-${crypto.randomUUID()}`,
      date: new Date().toISOString(),
      title: partial.title?.trim() || 'Untitled Event',
      category: (partial.category as Category) || 'Legislative',
      direction: (partial.direction as 1 | -1) ?? 1,
      magnitude: Number(partial.magnitude ?? 1),
      confidence: Number(partial.confidence ?? 0.8),
      url: partial.url?.trim() || undefined,
    }

    setEvents(prev => [event, ...prev])
    setDraft(d => ({ ...d, title: '', url: '' }))
  }

  function mergeEvents(previous: EventItem[], incoming: EventItem[]) {
    const map = new Map(previous.map(event => [event.id, event]))
    for (const event of incoming) map.set(event.id, event)
    return Array.from(map.values()).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText)
      if (Array.isArray(parsed)) {
        setEvents(previous => mergeEvents(previous, parsed))
      }
      setImportText('')
    } catch (err) {
      console.error('Failed to import events', err)
      alert('Invalid JSON. Expect an array of EventItem objects.')
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Category Gauges</h2>
          <p className="text-sm text-muted-foreground">
            Scores reflect decayed, confidence-weighted impacts over the past year.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map(category => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">{category}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_META[category].description}
                </p>
              </CardHeader>
              <CardContent>
                <Gauge value={categoryScores[category]} accentColor={CATEGORY_META[category].accentColor} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Event Ledger</h2>
            <p className="text-sm text-muted-foreground">
              Filter, search, and review the most recent developments.
            </p>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value as CategoryFilter)}
            >
              <option value="All">All categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={directionFilter}
              onChange={event => setDirectionFilter(event.target.value as DirectionFilter)}
            >
              <option value="all">All directions</option>
              <option value="positive">Pro-democracy</option>
              <option value="negative">Anti-democracy</option>
            </select>
            <Input placeholder="Search events" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-4 py-4 md:grid-cols-4">
            <LedgerStat label="Visible events" value={filteredStats.total.toString()} />
            <LedgerStat label="Positive" value={filteredStats.positive.toString()} tone="positive" />
            <LedgerStat label="Negative" value={filteredStats.negative.toString()} tone="negative" />
            <LedgerStat
              label="Net impact"
              value={`${filteredStats.netImpact >= 0 ? '+' : ''}${filteredStats.netImpact.toFixed(2)}`}
              tone={filteredStats.netImpact >= 0 ? 'positive' : 'negative'}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredEvents.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No events match your filters yet.
            </div>
          )}
          {filteredEvents.map(event => (
            <EventRow key={event.id} event={event} detailed />
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="py-3">
            <CardTitle>Add Event (Quick)</CardTitle>
          </CardHeader>
          <CardContent className="grid items-end gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="text-sm">Title</label>
              <Input
                value={draft.title}
                onChange={event => setDraft(previous => ({ ...previous, title: event.target.value }))}
                placeholder="e.g., Court blocks voter suppression bill"
              />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <select
                className="h-10 w-full rounded-md border px-2"
                value={draft.category}
                onChange={event => setDraft(previous => ({ ...previous, category: event.target.value as Category }))}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Direction</label>
              <select
                className="h-10 w-full rounded-md border px-2"
                value={draft.direction}
                onChange={event =>
                  setDraft(previous => ({ ...previous, direction: Number(event.target.value) as 1 | -1 }))
                }
              >
                <option value={1}>Towards Democracy (+)</option>
                <option value={-1}>Towards Autocracy (-)</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Magnitude</label>
              <Input
                type="number"
                step="0.1"
                value={draft.magnitude}
                onChange={event => setDraft(previous => ({ ...previous, magnitude: Number(event.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm">Confidence</label>
              <Input
                type="number"
                step="0.05"
                value={draft.confidence}
                onChange={event => setDraft(previous => ({ ...previous, confidence: Number(event.target.value) }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Source URL</label>
              <Input
                value={draft.url}
                onChange={event => setDraft(previous => ({ ...previous, url: event.target.value }))}
                placeholder="https://example.com/source"
              />
            </div>
            <Button className="md:col-span-1" onClick={() => addEvent(draft)}>
              Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle>Import Events (JSON)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={8}
              value={importText}
              onChange={event => setImportText(event.target.value)}
              placeholder={exampleImportPayload}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleImport}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="secondary" onClick={() => setImportText(exampleImportPayload)}>
                Load Example
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function LedgerStat({
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
