export type WeatherData = {
  current: {
    observedAt: string;
    temperatureCelsius: number;
    relativeHumidityPercent: number;
    windSpeedKmh: number;
  };
  hourlyForecast: { time: string; temperatureCelsius: number }[];
  fetchedAt: string;
};
