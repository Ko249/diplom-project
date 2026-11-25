import type { WeatherData } from '../model/weather-data';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function isWeatherData(data: unknown): data is WeatherData {
  if (!isRecord(data)) {
    return false;
  }

  const { current, hourlyForecast, fetchedAt } = data;

  return (
    isRecord(current) &&
    isUtcTimestamp(current.observedAt) &&
    Number.isFinite(current.temperatureCelsius) &&
    Number.isFinite(current.relativeHumidityPercent) &&
    Number.isFinite(current.windSpeedKmh) &&
    isUtcTimestamp(fetchedAt) &&
    Array.isArray(hourlyForecast) &&
    hourlyForecast.length > 0 &&
    hourlyForecast.every(
      (point: unknown) =>
        isRecord(point) && isUtcTimestamp(point.time) && Number.isFinite(point.temperatureCelsius),
    )
  );
}

export async function getWeather(signal: AbortSignal): Promise<WeatherData> {
  const response = await fetch('/api/weather', { signal });

  if (!response.ok) {
    throw new Error(`Запрос погоды завершился с HTTP ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!isWeatherData(data)) {
    throw new Error('Неожиданный формат погодных данных');
  }

  return data;
}
