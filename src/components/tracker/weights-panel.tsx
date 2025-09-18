'use client';

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { CATEGORIES, CategoryWeights, createDefaultWeights } from '@/lib/democracy'

type WeightsPanelProps = {
  weights: CategoryWeights
  setWeights: React.Dispatch<React.SetStateAction<CategoryWeights>>
}

export function WeightsPanel({ weights, setWeights }: WeightsPanelProps) {
  const totalWeight = useMemo(() => Object.values(weights).reduce((acc, value) => acc + value, 0), [weights])

  function handleReset() {
    setWeights(createDefaultWeights())
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-3">
        <CardTitle>Category Weights</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Total weight:</span>
          <span className="font-semibold text-foreground">{totalWeight.toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map(category => {
          const share = totalWeight > 0 ? (weights[category] / totalWeight) * 100 : 0
          return (
            <div key={category} className="space-y-2 rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{category}</span>
                <span className="text-sm text-muted-foreground">{weights[category].toFixed(2)}</span>
              </div>
              <Slider
                value={[weights[category]]}
                min={0}
                max={3}
                step={0.05}
                onValueChange={value => setWeights(previous => ({ ...previous, [category]: value[0] }))}
              />
              <div className="text-xs text-muted-foreground">
                {share.toFixed(0)}% of total influence
              </div>
            </div>
          )
        })}
        <Button variant="secondary" onClick={handleReset} className="md:col-span-2">
          Reset weights
        </Button>
      </CardContent>
    </Card>
  )
}
