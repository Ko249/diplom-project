import { Router } from 'express';

type HealthResponse = { status: 'ok' };

export const healthRouter = Router();

healthRouter.get<Record<string, never>, HealthResponse, unknown>('/', (_request, response) => {
  response.json({ status: 'ok' });
});
