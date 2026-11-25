export { runSimulation } from './run-simulation.js';
export { defaultSimulationConfig, maxSimulationSteps } from './simulation.config.js';
export type {
  HeaterControl,
  RoomParameters,
  RoomProperties,
  SimulationInput,
  SimulationResult,
  SimulationState,
  SimulationStep,
  ThermalStepInput,
  ThermalStepResult,
  WeatherPoint,
} from './simulation.types.js';
export { calculateRoomProperties, calculateThermalStep } from './thermal-model.js';
export { interpolateOutdoorTemperature } from './weather-interpolation.js';
