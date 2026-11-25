import type { WeatherPoint } from './simulation.types.js';
import {
  parseUtcTimestamp,
  SimulationValidationError,
  validateTemperature,
} from './simulation.validation.js';

type TimedTemperature = {
  timeMilliseconds: number;
  temperatureCelsius: number;
};

export function prepareWeather(points: readonly WeatherPoint[]) {
  if (points.length < 2) {
    throw new SimulationValidationError('weather: требуется не менее двух погодных точек');
  }

  const parsed: TimedTemperature[] = [];
  let previousTime: number | undefined;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      throw new SimulationValidationError(`weather[${index}]: отсутствует погодная точка`);
    }

    const timeMilliseconds = parseUtcTimestamp(point.time, `weather[${index}].time`);
    validateTemperature(point.temperatureCelsius, `weather[${index}].temperatureCelsius`);
    if (previousTime !== undefined && timeMilliseconds <= previousTime) {
      throw new SimulationValidationError(
        `weather[${index}].time: точки должны строго возрастать без дубликатов`,
      );
    }

    parsed.push({ timeMilliseconds, temperatureCelsius: point.temperatureCelsius });
    previousTime = timeMilliseconds;
  }

  const firstTime = parsed[0].timeMilliseconds;
  const lastTime = parsed[parsed.length - 1].timeMilliseconds;

  return {
    firstTime,
    lastTime,
    temperatureAt(timeMilliseconds: number): number {
      if (timeMilliseconds < firstTime || timeMilliseconds > lastTime) {
        throw new SimulationValidationError('Время интерполяции вне интервала погодных данных');
      }

      let left = 0;
      let right = parsed.length - 1;
      while (right - left > 1) {
        const middle = Math.floor((left + right) / 2);
        if (parsed[middle].timeMilliseconds <= timeMilliseconds) {
          left = middle;
        } else {
          right = middle;
        }
      }

      const start = parsed[left];
      const end = parsed[right];
      const elapsed = timeMilliseconds - start.timeMilliseconds;
      const remaining = end.timeMilliseconds - timeMilliseconds;
      const interval = end.timeMilliseconds - start.timeMilliseconds;
      // Считаем от ближайшей точки: в том числе точно возвращаем температуру на границе.
      if (elapsed <= remaining) {
        return (
          start.temperatureCelsius +
          (end.temperatureCelsius - start.temperatureCelsius) * (elapsed / interval)
        );
      }

      return (
        end.temperatureCelsius +
        (start.temperatureCelsius - end.temperatureCelsius) * (remaining / interval)
      );
    },
  };
}

export function interpolateOutdoorTemperature(
  points: readonly WeatherPoint[],
  time: string,
): number {
  const milliseconds = parseUtcTimestamp(time, 'time');
  return prepareWeather(points).temperatureAt(milliseconds);
}
