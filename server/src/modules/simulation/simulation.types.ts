export type HeaterControl = 0 | 1;

export type RoomParameters = Readonly<{
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  windowAreaSquareMeters: number;
  wallTransmittanceWattsPerSquareMeterKelvin: number;
  windowTransmittanceWattsPerSquareMeterKelvin: number;
  airChangesPerHour: number;
  effectiveHeatCapacityJoulesPerSquareMeterKelvin: number;
}>;

export type RoomProperties = {
  floorAreaSquareMeters: number;
  volumeCubicMeters: number;
  opaqueWallAreaSquareMeters: number;
  wallHeatLossWattsPerKelvin: number;
  windowHeatLossWattsPerKelvin: number;
  airHeatLossWattsPerKelvin: number;
  heatLossWattsPerKelvin: number;
  heatCapacityJoulesPerKelvin: number;
  timeConstantSeconds: number | null;
};

export type WeatherPoint = Readonly<{
  time: string;
  temperatureCelsius: number;
}>;

export type ThermalStepInput = Readonly<{
  heatLossWattsPerKelvin: number;
  heatCapacityJoulesPerKelvin: number;
  indoorTemperatureCelsius: number;
  outdoorTemperatureCelsius: number;
  heaterPowerWatts: number;
  heaterControl: HeaterControl;
  durationSeconds: number;
}>;

export type ThermalStepResult = {
  heatingPowerWatts: number;
  heatLossPowerWatts: number;
  heatBalanceWatts: number;
  endIndoorTemperatureCelsius: number;
  energyKilowattHours: number;
};

export type SimulationInput = Readonly<{
  room: RoomParameters;
  initialIndoorTemperatureCelsius: number;
  heaterPowerWatts: number;
  heaterControl: HeaterControl;
  startTime: string;
  durationSeconds: number;
  stepSeconds: number;
  weather: readonly WeatherPoint[];
}>;

export type SimulationState = {
  time: string;
  indoorTemperatureCelsius: number;
  totalEnergyKilowattHours: number;
  heaterRuntimeSeconds: number;
};

export type SimulationStep = {
  start: SimulationState &
    Pick<ThermalStepResult, 'heatingPowerWatts' | 'heatLossPowerWatts' | 'heatBalanceWatts'> & {
      outdoorTemperatureCelsius: number;
      heaterControl: HeaterControl;
    };
  end: SimulationState;
  energyKilowattHours: number;
};

export type SimulationResult = {
  roomProperties: RoomProperties;
  initialState: SimulationState;
  steps: SimulationStep[];
  finalIndoorTemperatureCelsius: number;
  minIndoorTemperatureCelsius: number;
  maxIndoorTemperatureCelsius: number;
  totalEnergyKilowattHours: number;
  heaterRuntimeSeconds: number;
};
