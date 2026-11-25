import { Router } from 'express';
import { getWeather, WeatherUpstreamError } from './open-meteo.client.js';
import type { WeatherData } from './weather.types.js';

type WeatherErrorResponse = {
  error: {
    code: WeatherUpstreamError['code'];
    message: string;
  };
};

export const weatherRouter = Router();

weatherRouter.get<Record<string, never>, WeatherData | WeatherErrorResponse, unknown>(
  '/',
  async (_request, response) => {
    response.set('Cache-Control', 'no-store');

    try {
      response.json(await getWeather());
    } catch (error) {
      if (!(error instanceof WeatherUpstreamError)) {
        throw error;
      }

      const timedOut = error.code === 'WEATHER_UPSTREAM_TIMEOUT';

      response.status(timedOut ? 504 : 502).json({
        error: {
          code: error.code,
          message: timedOut
            ? 'Не удалось получить данные Open-Meteo вовремя'
            : 'Не удалось получить корректные погодные данные от Open-Meteo',
        },
      });
    }
  },
);
