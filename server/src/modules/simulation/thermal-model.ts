import type {
  RoomParameters,
  RoomProperties,
  ThermalStepInput,
  ThermalStepResult,
} from './simulation.types.js';
import {
  validateFiniteNumber,
  validateNonNegativeNumber,
  validatePositiveNumber,
  validateTemperature,
} from './simulation.validation.js';

const airHeatLossFactor = 0.33;
const joulesPerKilowattHour = 3_600_000;

export function calculateRoomProperties(parameters: RoomParameters): RoomProperties {
  const {
    lengthMeters,
    widthMeters,
    heightMeters,
    windowAreaSquareMeters,
    wallTransmittanceWattsPerSquareMeterKelvin,
    windowTransmittanceWattsPerSquareMeterKelvin,
    airChangesPerHour,
    effectiveHeatCapacityJoulesPerSquareMeterKelvin,
  } = parameters;

  validatePositiveNumber(lengthMeters, 'lengthMeters');
  validatePositiveNumber(widthMeters, 'widthMeters');
  validatePositiveNumber(heightMeters, 'heightMeters');
  validateNonNegativeNumber(windowAreaSquareMeters, 'windowAreaSquareMeters');
  validateNonNegativeNumber(
    wallTransmittanceWattsPerSquareMeterKelvin,
    'wallTransmittanceWattsPerSquareMeterKelvin',
  );
  validateNonNegativeNumber(
    windowTransmittanceWattsPerSquareMeterKelvin,
    'windowTransmittanceWattsPerSquareMeterKelvin',
  );
  validateNonNegativeNumber(airChangesPerHour, 'airChangesPerHour');
  validatePositiveNumber(
    effectiveHeatCapacityJoulesPerSquareMeterKelvin,
    'effectiveHeatCapacityJoulesPerSquareMeterKelvin',
  );

  const floorAreaSquareMeters = lengthMeters * widthMeters;
  const volumeCubicMeters = floorAreaSquareMeters * heightMeters;
  const grossWallAreaSquareMeters = (lengthMeters + widthMeters) * heightMeters;
  validatePositiveNumber(floorAreaSquareMeters, 'Расчётная площадь пола');
  validatePositiveNumber(volumeCubicMeters, 'Расчётный объём помещения');
  validatePositiveNumber(grossWallAreaSquareMeters, 'Расчётная площадь наружных стен');

  if (windowAreaSquareMeters > grossWallAreaSquareMeters) {
    throw new RangeError('windowAreaSquareMeters: площадь окна превышает площадь наружных стен');
  }

  const opaqueWallAreaSquareMeters = grossWallAreaSquareMeters - windowAreaSquareMeters;
  const wallHeatLossWattsPerKelvin =
    wallTransmittanceWattsPerSquareMeterKelvin * opaqueWallAreaSquareMeters;
  const windowHeatLossWattsPerKelvin =
    windowTransmittanceWattsPerSquareMeterKelvin * windowAreaSquareMeters;
  const airHeatLossWattsPerKelvin = airHeatLossFactor * airChangesPerHour * volumeCubicMeters;
  const heatLossWattsPerKelvin =
    wallHeatLossWattsPerKelvin + windowHeatLossWattsPerKelvin + airHeatLossWattsPerKelvin;
  const heatCapacityJoulesPerKelvin =
    floorAreaSquareMeters * effectiveHeatCapacityJoulesPerSquareMeterKelvin;
  validateFiniteNumber(heatLossWattsPerKelvin, 'Расчётный коэффициент теплопотерь');
  validatePositiveNumber(heatCapacityJoulesPerKelvin, 'Расчётная теплоёмкость');

  const timeConstantSeconds =
    heatLossWattsPerKelvin === 0 ? null : heatCapacityJoulesPerKelvin / heatLossWattsPerKelvin;
  if (timeConstantSeconds !== null) {
    validatePositiveNumber(timeConstantSeconds, 'Расчётная постоянная времени');
  }

  return {
    floorAreaSquareMeters,
    volumeCubicMeters,
    opaqueWallAreaSquareMeters,
    wallHeatLossWattsPerKelvin,
    windowHeatLossWattsPerKelvin,
    airHeatLossWattsPerKelvin,
    heatLossWattsPerKelvin,
    heatCapacityJoulesPerKelvin,
    timeConstantSeconds,
  };
}

function multiplyDivide(a: number, b: number, divisor: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }

  const product = a * b;
  if (Number.isFinite(product) && product !== 0) {
    return product / divisor;
  }

  // Меняем порядок операций, если само произведение вышло за диапазон number.
  return (Math.max(a, b) / divisor) * Math.min(a, b);
}

export function calculateThermalStep(input: ThermalStepInput): ThermalStepResult {
  const {
    heatLossWattsPerKelvin: heatLoss,
    heatCapacityJoulesPerKelvin: heatCapacity,
    indoorTemperatureCelsius: indoor,
    outdoorTemperatureCelsius: outdoor,
    heaterPowerWatts,
    heaterControl,
    durationSeconds,
  } = input;

  validateNonNegativeNumber(heatLoss, 'heatLossWattsPerKelvin');
  validatePositiveNumber(heatCapacity, 'heatCapacityJoulesPerKelvin');
  validateTemperature(indoor, 'indoorTemperatureCelsius');
  validateTemperature(outdoor, 'outdoorTemperatureCelsius');
  validateNonNegativeNumber(heaterPowerWatts, 'heaterPowerWatts');
  validatePositiveNumber(durationSeconds, 'durationSeconds');
  if (heaterControl !== 0 && heaterControl !== 1) {
    throw new RangeError('heaterControl: ожидается 0 или 1');
  }

  const heatingPowerWatts = heaterPowerWatts * heaterControl;
  const heatLossPowerWatts = heatLoss * (indoor - outdoor);
  const heatBalanceWatts = heatingPowerWatts - heatLossPowerWatts;
  validateFiniteNumber(heatLossPowerWatts, 'Расчётная мощность теплопотерь');
  validateFiniteNumber(heatBalanceWatts, 'Расчётный тепловой баланс');

  let endIndoorTemperatureCelsius: number;
  if (heatLoss === 0) {
    endIndoorTemperatureCelsius =
      indoor + multiplyDivide(heatingPowerWatts, durationSeconds, heatCapacity);
  } else {
    const x = multiplyDivide(heatLoss, durationSeconds, heatCapacity);
    const response = -Math.expm1(-x);

    if (x <= 1) {
      // При малом x вычисляем отклик нагревателя без деления мощности на малое H.
      const averageResponse = x === 0 ? 1 : response / x;
      const heatingDelta = multiplyDivide(
        heatingPowerWatts,
        durationSeconds * averageResponse,
        heatCapacity,
      );
      endIndoorTemperatureCelsius = indoor + (outdoor - indoor) * response + heatingDelta;
    } else {
      const heatingDelta = multiplyDivide(heatingPowerWatts, response, heatLoss);
      endIndoorTemperatureCelsius = outdoor + (indoor - outdoor) * Math.exp(-x) + heatingDelta;
    }
  }

  const energyKilowattHours = multiplyDivide(
    heatingPowerWatts,
    durationSeconds,
    joulesPerKilowattHour,
  );
  validateTemperature(endIndoorTemperatureCelsius, 'Расчётная температура на конец шага');
  validateFiniteNumber(energyKilowattHours, 'Расчётное энергопотребление шага');

  return {
    heatingPowerWatts,
    heatLossPowerWatts,
    heatBalanceWatts,
    endIndoorTemperatureCelsius,
    energyKilowattHours,
  };
}
