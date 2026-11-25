import { getWeather, weatherConfig, WeatherUpstreamError } from '../weather/index.js';
import { calculateRoomProperties, defaultSimulationConfig, runSimulation } from './index.js';
import type { WeatherPoint } from './index.js';
import type {
  SimulationConfiguration,
  SimulationRequest,
  SimulationResponse,
} from './simulation.dto.js';
import {
  SimulationValidationError,
  validateNonNegativeNumber,
  validateSimulationTiming,
  validateTemperature,
} from './simulation.validation.js';
import { prepareWeather } from './weather-interpolation.js';

const simulationApiConfig = {
  minDurationSeconds: 60,
  maxDurationSeconds: 86_400,
  defaultDurationSeconds: 86_400,
  minStepSeconds: 60,
  maxSteps: 1440,
  forecastHours: 26,
};

export class SimulationWeatherCoverageError extends Error {}

export async function simulate(request: SimulationRequest): Promise<SimulationResponse> {
  const room = { ...defaultSimulationConfig.room, ...request.room };
  const initialIndoorTemperatureCelsius =
    request.initialIndoorTemperatureCelsius ??
    defaultSimulationConfig.initialIndoorTemperatureCelsius;
  const heaterPowerWatts = request.heaterPowerWatts ?? defaultSimulationConfig.heaterPowerWatts;
  const durationSeconds = request.durationSeconds ?? simulationApiConfig.defaultDurationSeconds;
  const stepSeconds = request.stepSeconds ?? defaultSimulationConfig.stepSeconds;
  const { heaterControl } = request;
  const { minDurationSeconds, maxDurationSeconds, minStepSeconds, maxSteps } = simulationApiConfig;

  if (durationSeconds < minDurationSeconds || durationSeconds > maxDurationSeconds) {
    throw new SimulationValidationError(
      `durationSeconds: допустимая продолжительность от ${minDurationSeconds} до ${maxDurationSeconds} секунд`,
    );
  }
  if (stepSeconds < minStepSeconds || stepSeconds > durationSeconds) {
    throw new SimulationValidationError(
      `stepSeconds: шаг должен быть не меньше ${minStepSeconds} секунд и не больше продолжительности`,
    );
  }

  const { duration, stepCount } = validateSimulationTiming(durationSeconds, stepSeconds);
  if (stepCount > maxSteps) {
    throw new SimulationValidationError(`Количество шагов превышает лимит API: ${maxSteps}`);
  }

  // Используем проверки ядра до сетевого запроса, чтобы ошибочные входные данные давали 400.
  calculateRoomProperties(room);
  validateTemperature(initialIndoorTemperatureCelsius, 'initialIndoorTemperatureCelsius');
  validateNonNegativeNumber(heaterPowerWatts, 'heaterPowerWatts');

  const { hourlyForecast, fetchedAt } = await getWeather(simulationApiConfig.forecastHours);
  const startMilliseconds = Date.now();
  const forecast = prepareForecast(hourlyForecast);
  if (startMilliseconds < forecast.firstTime || startMilliseconds + duration > forecast.lastTime) {
    throw new SimulationWeatherCoverageError(
      'Прогноз Open-Meteo не покрывает весь период симуляции, включая его конец',
    );
  }

  const configuration: SimulationConfiguration = {
    room,
    initialIndoorTemperatureCelsius,
    heaterPowerWatts,
    heaterControl,
    startTime: new Date(startMilliseconds).toISOString(),
    durationSeconds,
    stepSeconds,
  };

  return {
    configuration,
    weather: {
      source: 'Open-Meteo',
      latitude: weatherConfig.latitude,
      longitude: weatherConfig.longitude,
      fetchedAt,
      forecastStartTime: new Date(forecast.firstTime).toISOString(),
      forecastEndTime: new Date(forecast.lastTime).toISOString(),
    },
    result: runSimulation({ ...configuration, weather: hourlyForecast }),
  };
}

function prepareForecast(points: readonly WeatherPoint[]) {
  try {
    return prepareWeather(points);
  } catch (error) {
    if (error instanceof SimulationValidationError) {
      throw new WeatherUpstreamError('WEATHER_UPSTREAM_ERROR', error);
    }
    throw error;
  }
}
