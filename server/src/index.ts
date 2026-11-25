import express from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { weatherRouter } from './modules/weather/weather.routes.js';

const app = express();
const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT должен быть целым числом от 1 до 65535');
}

app.use('/api/health', healthRouter);
app.use('/api/weather', weatherRouter);

app.listen(port, host, (error) => {
  if (error) {
    throw error;
  }

  console.log(`Сервер запущен: http://${host}:${port}`);
});
