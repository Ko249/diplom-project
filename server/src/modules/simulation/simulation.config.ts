import type { RoomParameters } from './simulation.types.js';

export const defaultSimulationConfig = Object.freeze({
  room: Object.freeze({
    lengthMeters: 5,
    widthMeters: 4,
    heightMeters: 2.7,
    windowAreaSquareMeters: 3,
    wallTransmittanceWattsPerSquareMeterKelvin: 0.5,
    windowTransmittanceWattsPerSquareMeterKelvin: 1.8,
    airChangesPerHour: 0.5,
    effectiveHeatCapacityJoulesPerSquareMeterKelvin: 165_000,
  } satisfies RoomParameters),
  heaterPowerWatts: 2000,
  initialIndoorTemperatureCelsius: 20,
  targetIndoorTemperatureCelsius: 22,
  stepSeconds: 60,
});

export const maxSimulationSteps = 100_000;
