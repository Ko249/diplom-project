import { maxSimulationSteps } from './simulation.config.js';
import type {
  SimulationInput,
  SimulationResult,
  SimulationState,
  SimulationStep,
} from './simulation.types.js';
import {
  parseUtcTimestamp,
  SimulationValidationError,
  validateFiniteNumber,
  validateSimulationTiming,
} from './simulation.validation.js';
import { calculateRoomProperties, calculateThermalStep } from './thermal-model.js';
import { prepareWeather } from './weather-interpolation.js';

export function runSimulation(input: SimulationInput): SimulationResult {
  const { room, initialIndoorTemperatureCelsius, heaterPowerWatts, heaterControl } = input;
  const startTime = parseUtcTimestamp(input.startTime, 'startTime');
  const { duration, step, stepCount } = validateSimulationTiming(
    input.durationSeconds,
    input.stepSeconds,
  );
  if (stepCount > maxSimulationSteps) {
    throw new SimulationValidationError(
      `Количество шагов симуляции превышает лимит ${maxSimulationSteps}`,
    );
  }

  const endTime = startTime + duration;
  if (!Number.isFinite(new Date(endTime).getTime())) {
    throw new SimulationValidationError('Конец периода симуляции вне диапазона дат UTC');
  }

  const weather = prepareWeather(input.weather);
  if (startTime < weather.firstTime || endTime > weather.lastTime) {
    throw new SimulationValidationError(
      'weather: погодные данные должны покрывать весь период, включая его конец',
    );
  }

  const roomProperties = calculateRoomProperties(room);
  const initialState: SimulationState = {
    time: new Date(startTime).toISOString(),
    indoorTemperatureCelsius: initialIndoorTemperatureCelsius,
    totalEnergyKilowattHours: 0,
    heaterRuntimeSeconds: 0,
  };
  const steps: SimulationStep[] = [];
  let state = initialState;
  let minIndoorTemperatureCelsius = initialIndoorTemperatureCelsius;
  let maxIndoorTemperatureCelsius = initialIndoorTemperatureCelsius;

  for (let index = 0; index < stepCount; index += 1) {
    const outdoorTemperatureCelsius = weather.temperatureAt(startTime + index * step);
    const {
      heatingPowerWatts,
      heatLossPowerWatts,
      heatBalanceWatts,
      endIndoorTemperatureCelsius,
      energyKilowattHours,
    } = calculateThermalStep({
      heatLossWattsPerKelvin: roomProperties.heatLossWattsPerKelvin,
      heatCapacityJoulesPerKelvin: roomProperties.heatCapacityJoulesPerKelvin,
      indoorTemperatureCelsius: state.indoorTemperatureCelsius,
      outdoorTemperatureCelsius,
      heaterPowerWatts,
      heaterControl,
      durationSeconds: input.stepSeconds,
    });

    const elapsedMilliseconds = (index + 1) * step;
    const totalEnergyKilowattHours = state.totalEnergyKilowattHours + energyKilowattHours;
    validateFiniteNumber(totalEnergyKilowattHours, 'Суммарное энергопотребление');
    const end: SimulationState = {
      time: new Date(startTime + elapsedMilliseconds).toISOString(),
      indoorTemperatureCelsius: endIndoorTemperatureCelsius,
      totalEnergyKilowattHours,
      heaterRuntimeSeconds: heaterControl === 1 ? elapsedMilliseconds / 1000 : 0,
    };

    steps.push({
      start: {
        ...state,
        outdoorTemperatureCelsius,
        heaterControl,
        heatingPowerWatts,
        heatLossPowerWatts,
        heatBalanceWatts,
      },
      end,
      energyKilowattHours,
    });
    state = end;
    minIndoorTemperatureCelsius = Math.min(
      minIndoorTemperatureCelsius,
      state.indoorTemperatureCelsius,
    );
    maxIndoorTemperatureCelsius = Math.max(
      maxIndoorTemperatureCelsius,
      state.indoorTemperatureCelsius,
    );
  }

  return {
    roomProperties,
    initialState,
    steps,
    finalIndoorTemperatureCelsius: state.indoorTemperatureCelsius,
    minIndoorTemperatureCelsius,
    maxIndoorTemperatureCelsius,
    totalEnergyKilowattHours: state.totalEnergyKilowattHours,
    heaterRuntimeSeconds: state.heaterRuntimeSeconds,
  };
}
