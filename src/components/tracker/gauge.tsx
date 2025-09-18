'use client';

import { motion } from 'framer-motion'

export function Gauge({ value, accentColor }: { value: number; accentColor: string }) {
  return (
    <div className="space-y-2">
      <div className="text-2xl font-semibold">{value.toFixed(1)}</div>
      <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="absolute inset-0 flex">
          <div className="h-full w-1/2 bg-red-50" />
          <div className="h-full w-1/2 bg-green-50" />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
        <motion.div
          className="absolute top-0 h-full"
          style={{ backgroundColor: accentColor, width: '4%' }}
          initial={{ x: '50%' }}
          animate={{ x: `${50 + value / 2}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  )
}
