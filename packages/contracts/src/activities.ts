// `Activity` is generated from `schema.graphql` — do not redefine it here.
// `ActivityLabel` is `Record<Activity, string>`, so adding a new value in the
// schema will force a TypeScript error here until the label is filled in.
import { Activity } from "./activities.generated.js";

export { Activity };

export const activities: readonly Activity[] = Object.values(Activity);

export const ActivityLabel: Record<Activity, string> = {
  SKIING: "Skiing",
  SURFING: "Surfing",
  OUTDOOR_SIGHTSEEING: "Outdoor sightseeing",
  INDOOR_SIGHTSEEING: "Indoor sightseeing"
};

export const FORECAST_DAYS = 7;
