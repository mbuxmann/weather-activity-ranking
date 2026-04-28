import type { ActivityScore } from "./types.js";
import type { WeatherDay } from "../weather/types.js";
import { tier } from "./tier.js";

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const scoreSkiing = (day: WeatherDay): ActivityScore => {
  const coldBonus = tier(day.temperatureMaxC, [
    { when: (t) => t <= 2, points: 35 },
    { when: (t) => t <= 6, points: 20 }
  ]);
  const snowBonus = Math.min(45, day.snowfallCm * 12);
  const windPenalty = day.windSpeedKph > 35 ? 20 : 0;

  return {
    activity: "SKIING",
    score: clampScore(20 + coldBonus + snowBonus - windPenalty),
    reason: "Scores higher with colder temperatures, snowfall, and manageable wind."
  };
};

export const scoreSurfing = (day: WeatherDay): ActivityScore => {
  // NOTE: surfing scoring is intentionally untouched in this task.
  // It will be rewritten in Task 6 to use marine forecast data.
  const warmthBonus = day.temperatureMaxC >= 20 ? 25 : day.temperatureMaxC >= 15 ? 12 : 0;
  const windBonus = day.windSpeedKph >= 12 && day.windSpeedKph <= 30 ? 25 : 5;
  const stormPenalty = day.precipitationMm > 15 ? 25 : 0;

  return {
    activity: "SURFING",
    score: clampScore(25 + warmthBonus + windBonus - stormPenalty),
    reason: "Initial heuristic uses warm weather, usable wind, and low storm risk."
  };
};

export const scoreOutdoorSightseeing = (day: WeatherDay): ActivityScore => {
  const comfortBonus = tier(day.temperatureMaxC, [
    { when: (t) => t >= 16 && t <= 28, points: 35 }
  ]) || 15;
  const dryBonus = tier(day.precipitationMm, [
    { when: (p) => p <= 2, points: 30 },
    { when: (p) => p <= 8, points: 15 }
  ]);
  const windPenalty = day.windSpeedKph > 35 ? 15 : 0;

  return {
    activity: "OUTDOOR_SIGHTSEEING",
    score: clampScore(25 + comfortBonus + dryBonus - windPenalty),
    reason: "Scores higher for comfortable, dry days with lower wind."
  };
};

export const scoreIndoorSightseeing = (day: WeatherDay): ActivityScore => {
  const poorWeatherBonus = tier(day.precipitationMm, [
    { when: (p) => p > 8, points: 35 }
  ]) || (day.windSpeedKph > 35 ? 20 : 0);
  const uncomfortableTempBonus = tier(day.temperatureMaxC, [
    { when: (t) => t < 10 || t > 32, points: 20 }
  ]);

  return {
    activity: "INDOOR_SIGHTSEEING",
    score: clampScore(35 + poorWeatherBonus + uncomfortableTempBonus),
    reason: "Scores higher when outdoor conditions are less comfortable."
  };
};
