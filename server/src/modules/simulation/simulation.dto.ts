import type { WeatherUpstreamError } from '../weather/index.js';
import type { RoomParameters, SimulationInput, SimulationResult } from './index.js';

export type SimulationRequest = Pick<SimulationInput, 'heaterControl'> &
  Partial<
    Pick<
      SimulationInput,
      'initialIndoorTemperatureCelsius' | 'heaterPowerWatts' | 'durationSeconds' | 'stepSeconds'
    >
  > & { room?: Partial<RoomParameters> };

export type SimulationConfiguration = Omit<SimulationInput, 'weather'>;

export type SimulationWeatherMetadata = {
  source: 'Open-Meteo';
  latitude: number;
  longitude: number;
  fetchedAt: string;
  forecastStartTime: string;
  forecastEndTime: string;
};

export type SimulationResponse = {
  configuration: SimulationConfiguration;
  weather: SimulationWeatherMetadata;
  result: SimulationResult;
};

export type SimulationErrorResponse = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | WeatherUpstreamError['code']
      | 'WEATHER_COVERAGE_ERROR'
      | 'INTERNAL_SERVER_ERROR';
    message: string;
  };
};
