export const Activity = {
  INDOOR_SIGHTSEEING: 'INDOOR_SIGHTSEEING',
  OUTDOOR_SIGHTSEEING: 'OUTDOOR_SIGHTSEEING',
  SKIING: 'SKIING',
  SURFING: 'SURFING'
} as const;

export type Activity = typeof Activity[keyof typeof Activity];