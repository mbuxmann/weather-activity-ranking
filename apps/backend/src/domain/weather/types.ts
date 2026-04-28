export type Location = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type MarineDay = {
  date: string;
  waveHeightMaxM: number;
  wavePeriodMaxS: number;
  windWaveHeightMaxM: number;
};

export type WeatherDay = {
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationMm: number;
  snowfallCm: number;
  windSpeedKph: number;
  /**
   * Marine forecast for this day, when the location has coastal data.
   * Absent means the location has no coastal data, or the marine endpoint
   * did not return a matching date for this weather day.
   */
  marine?: MarineDay;
};
