import { weatherConfig } from './weather.config.js';
import type { WeatherData } from './weather.types.js';

const forecastEndpoint = 'https://api.open-meteo.com/v1/forecast';
const secondsPerHour = 3600;

export class WeatherUpstreamError extends Error {
  constructor(
    readonly code: 'WEATHER_UPSTREAM_ERROR' | 'WEATHER_UPSTREAM_TIMEOUT',
    cause: unknown,
  ) {
    super(code, { cause });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toUtcIso(value: unknown): string {
  if (!isFiniteNumber(value) || !Number.isSafeInteger(value)) {
    throw new Error('Некорректное время в ответе Open-Meteo');
  }

  const date = new Date(value * 1000);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Время в ответе Open-Meteo вне допустимого диапазона');
  }

  return date.toISOString();
}

function parseWeather(data: unknown, fetchedAt: string): WeatherData {
  if (!isRecord(data)) {
    throw new Error('Некорректный формат ответа Open-Meteo');
  }

  const { current, hourly, current_units: currentUnits, hourly_units: hourlyUnits } = data;

  if (
    data.utc_offset_seconds !== 0 ||
    !isRecord(currentUnits) ||
    currentUnits.time !== 'unixtime' ||
    currentUnits.temperature_2m !== '°C' ||
    currentUnits.relative_humidity_2m !== '%' ||
    currentUnits.wind_speed_10m !== 'km/h' ||
    !isRecord(hourlyUnits) ||
    hourlyUnits.time !== 'unixtime' ||
    hourlyUnits.temperature_2m !== '°C'
  ) {
    throw new Error('Неожиданные единицы измерения в ответе Open-Meteo');
  }

  if (!isRecord(current) || !isRecord(hourly)) {
    throw new Error('В ответе Open-Meteo отсутствуют текущие данные или прогноз');
  }

  const {
    temperature_2m: temperatureCelsius,
    relative_humidity_2m: relativeHumidityPercent,
    wind_speed_10m: windSpeedKmh,
  } = current;

  if (
    !isFiniteNumber(temperatureCelsius) ||
    !isFiniteNumber(relativeHumidityPercent) ||
    relativeHumidityPercent < 0 ||
    relativeHumidityPercent > 100 ||
    !isFiniteNumber(windSpeedKmh) ||
    windSpeedKmh < 0
  ) {
    throw new Error('Некорректные или отсутствующие текущие данные Open-Meteo');
  }

  const { time: forecastTimes, temperature_2m: forecastTemperatures } = hourly;

  if (
    !isUnknownArray(forecastTimes) ||
    !isUnknownArray(forecastTemperatures) ||
    forecastTimes.length !== weatherConfig.forecastHours ||
    forecastTemperatures.length !== forecastTimes.length
  ) {
    throw new Error('Некорректная длина прогноза Open-Meteo');
  }

  let previousTime: number | undefined;
  const hourlyForecast = forecastTimes.map((time, index) => {
    const temperature = forecastTemperatures[index];

    if (
      !isFiniteNumber(time) ||
      !isFiniteNumber(temperature) ||
      time % secondsPerHour !== 0 ||
      (previousTime !== undefined && time - previousTime !== secondsPerHour)
    ) {
      throw new Error('Некорректная или отсутствующая точка прогноза Open-Meteo');
    }

    previousTime = time;
    return { time: toUtcIso(time), temperatureCelsius: temperature };
  });

  return {
    current: {
      observedAt: toUtcIso(current.time),
      temperatureCelsius,
      relativeHumidityPercent,
      windSpeedKmh,
    },
    hourlyForecast,
    fetchedAt,
  };
}

export async function getWeather(): Promise<WeatherData> {
  const url = new URL(forecastEndpoint);
  url.search = new URLSearchParams({
    latitude: String(weatherConfig.latitude),
    longitude: String(weatherConfig.longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    hourly: 'temperature_2m',
    forecast_hours: String(weatherConfig.forecastHours),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'GMT',
    timeformat: 'unixtime',
  }).toString();

  const signal = AbortSignal.timeout(weatherConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Open-Meteo вернул HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    return parseWeather(data, new Date().toISOString());
  } catch (error) {
    const code = signal.aborted ? 'WEATHER_UPSTREAM_TIMEOUT' : 'WEATHER_UPSTREAM_ERROR';
    throw new WeatherUpstreamError(code, error);
  }
}
