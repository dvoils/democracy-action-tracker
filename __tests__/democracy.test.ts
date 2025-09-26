import { getSeedEvents, type EventItem } from '@/lib/democracy'

describe('getSeedEvents', () => {
  it('returns an array of 3 valid EventItems with ISO dates', () => {
    const events = getSeedEvents()
    expect(events).toHaveLength(3)

    for (const event of events) {
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('title')
      expect(event).toHaveProperty('category')
      expect(event).toHaveProperty('direction')
      expect(event).toHaveProperty('magnitude')
      expect(event).toHaveProperty('confidence')

      const parsedDate = new Date((event as EventItem).date)
      expect(() => parsedDate.toISOString()).not.toThrow()
    }
  })
})
