const absoluteZeroCelsius = -273.15;
const utcTimestampPattern =
  /^((?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;

export function validateFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${field}: ожидается конечное число`);
  }
}

export function validatePositiveNumber(value: number, field: string): void {
  validateFiniteNumber(value, field);
  if (value <= 0) {
    throw new RangeError(`${field}: значение должно быть больше нуля`);
  }
}

export function validateNonNegativeNumber(value: number, field: string): void {
  validateFiniteNumber(value, field);
  if (value < 0) {
    throw new RangeError(`${field}: значение не должно быть отрицательным`);
  }
}

export function validateTemperature(value: number, field: string): void {
  validateFiniteNumber(value, field);
  if (value < absoluteZeroCelsius) {
    throw new RangeError(`${field}: температура не может быть ниже абсолютного нуля`);
  }
}

export function parseUtcTimestamp(time: string, field: string): number {
  const match = typeof time === 'string' ? utcTimestampPattern.exec(time) : null;
  if (!match) {
    throw new RangeError(`${field}: ожидается метка ISO 8601 в UTC с суффиксом Z`);
  }

  const canonicalTime = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  const milliseconds = Date.parse(canonicalTime);
  // Date.parse может нормализовать несуществующие даты (например, 30 февраля).
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonicalTime) {
    throw new RangeError(`${field}: некорректная дата или время UTC`);
  }

  return milliseconds;
}

export function toPositiveMilliseconds(seconds: number, field: string): number {
  validatePositiveNumber(seconds, field);
  // Проверяем представимость на сетке миллисекунд, не округляя входное время.
  const milliseconds = Math.round(seconds * 1000);
  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds === 0 ||
    milliseconds / 1000 !== seconds
  ) {
    throw new RangeError(`${field}: длительность должна быть представима целым числом миллисекунд`);
  }

  return milliseconds;
}
