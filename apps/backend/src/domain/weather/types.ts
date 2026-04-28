export type Location = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type WeatherDay = {
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationMm: number;
  snowfallCm: number;
  windSpeedKph: number;
};
