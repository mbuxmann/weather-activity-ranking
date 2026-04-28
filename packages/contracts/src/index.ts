// Browser-safe barrel — no Node.js built-ins here.
// For the GraphQL schema path (Node.js only), use: import { schemaPath } from "contracts/node"

export { ErrorCode } from "./errorCodes.js";
export { Activity, activities, ActivityLabel, FORECAST_DAYS } from "./activities.js";
export { findBestDayPerActivity, type BestDay, type RankingForecast } from "./rankings.js";
