import { json, Router } from 'express';
import type { ErrorRequestHandler } from 'express';
import { WeatherUpstreamError } from '../weather/index.js';
import { defaultSimulationConfig } from './index.js';
import type { RoomParameters } from './index.js';
import type {
  SimulationErrorResponse,
  SimulationRequest,
  SimulationResponse,
} from './simulation.dto.js';
import { simulate, SimulationWeatherCoverageError } from './simulation.service.js';
import { SimulationValidationError } from './simulation.validation.js';

const requestFields = new Set([
  'room',
  'initialIndoorTemperatureCelsius',
  'heaterPowerWatts',
  'heaterControl',
  'durationSeconds',
  'stepSeconds',
]);

const invalidJsonErrorTypes = new Set([
  'entity.parse.failed',
  'entity.too.large',
  'charset.unsupported',
  'encoding.unsupported',
  'request.size.invalid',
  'request.aborted',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new SimulationValidationError(`${field}: ожидается число`);
  }
  return value;
}

function readOptionalNumber(value: unknown, field: string): number | undefined {
  return value === undefined ? undefined : readNumber(value, field);
}

function isRoomParameter(key: string): key is keyof RoomParameters {
  return Object.hasOwn(defaultSimulationConfig.room, key);
}

function parseRoom(value: unknown): Partial<RoomParameters> {
  if (!isRecord(value)) {
    throw new SimulationValidationError('room: ожидается объект');
  }

  const room: Partial<Record<keyof RoomParameters, number>> = {};
  for (const [key, parameter] of Object.entries(value)) {
    if (!isRoomParameter(key)) {
      throw new SimulationValidationError('room содержит неизвестный или серверный параметр');
    }
    room[key] = readNumber(parameter, `room.${key}`);
  }
  return room;
}

function parseRequest(body: unknown): SimulationRequest {
  if (!isRecord(body)) {
    throw new SimulationValidationError('Тело запроса должно быть JSON-объектом');
  }
  if (Object.keys(body).some((key) => !requestFields.has(key))) {
    throw new SimulationValidationError('Запрос содержит неизвестный или серверный параметр');
  }

  const {
    heaterControl,
    room,
    initialIndoorTemperatureCelsius,
    heaterPowerWatts,
    durationSeconds,
    stepSeconds,
  } = body;
  if (!Object.hasOwn(body, 'heaterControl') || (heaterControl !== 0 && heaterControl !== 1)) {
    throw new SimulationValidationError('heaterControl: обязательное поле со значением 0 или 1');
  }

  return {
    heaterControl,
    room: room === undefined ? undefined : parseRoom(room),
    initialIndoorTemperatureCelsius: readOptionalNumber(
      initialIndoorTemperatureCelsius,
      'initialIndoorTemperatureCelsius',
    ),
    heaterPowerWatts: readOptionalNumber(heaterPowerWatts, 'heaterPowerWatts'),
    durationSeconds: readOptionalNumber(durationSeconds, 'durationSeconds'),
    stepSeconds: readOptionalNumber(stepSeconds, 'stepSeconds'),
  };
}

const handleSimulationError: ErrorRequestHandler<
  Record<string, never>,
  SimulationErrorResponse,
  unknown
> = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SimulationValidationError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    return;
  }
  if (isRecord(error) && typeof error.type === 'string' && invalidJsonErrorTypes.has(error.type)) {
    response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Некорректное или слишком большое тело JSON' },
    });
    return;
  }
  if (error instanceof WeatherUpstreamError) {
    const timedOut = error.code === 'WEATHER_UPSTREAM_TIMEOUT';
    response.status(timedOut ? 504 : 502).json({
      error: {
        code: error.code,
        message: timedOut
          ? 'Не удалось получить данные Open-Meteo вовремя'
          : 'Не удалось получить корректные и полные погодные данные от Open-Meteo',
      },
    });
    return;
  }
  if (error instanceof SimulationWeatherCoverageError) {
    response
      .status(502)
      .json({ error: { code: 'WEATHER_COVERAGE_ERROR', message: error.message } });
    return;
  }

  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Не удалось выполнить симуляцию' },
  });
};

export const simulationRouter = Router();

simulationRouter.post<Record<string, never>, SimulationResponse, unknown>(
  '/',
  json(),
  async (request, response) => {
    const simulation = await simulate(parseRequest(request.body));
    response.status(200).json(simulation);
  },
);

simulationRouter.use(handleSimulationError);
