import { useEffect, useState } from 'react';
import { getWeather } from '@/entities/weather';
import type { WeatherData } from '@/entities/weather';

type WeatherState =
  { status: 'loading' } | { status: 'success'; data: WeatherData } | { status: 'error' };

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const numberFormatter = new Intl.NumberFormat('ru-RU');

function WeatherTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateTimeFormatter.format(new Date(value))}</time>;
}

function WeatherDetails({ data }: { data: WeatherData }) {
  const { current, hourlyForecast } = data;

  return (
    <>
      <dl>
        <dt>Температура</dt>
        <dd>{numberFormatter.format(current.temperatureCelsius)} °C</dd>
        <dt>Относительная влажность</dt>
        <dd>{numberFormatter.format(current.relativeHumidityPercent)} %</dd>
        <dt>Скорость ветра</dt>
        <dd>{numberFormatter.format(current.windSpeedKmh)} км/ч</dd>
        <dt>Время актуальности (UTC)</dt>
        <dd>
          <WeatherTime value={current.observedAt} />
        </dd>
      </dl>

      <table>
        <caption>Почасовой прогноз температуры</caption>
        <thead>
          <tr>
            <th scope="col">Время (UTC)</th>
            <th scope="col">Температура, °C</th>
          </tr>
        </thead>
        <tbody>
          {hourlyForecast.map(({ time, temperatureCelsius }) => (
            <tr key={time}>
              <td>
                <WeatherTime value={time} />
              </td>
              <td>{numberFormatter.format(temperatureCelsius)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getWeather(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setWeather({ status: 'success', data });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWeather({ status: 'error' });
        }
      });

    return () => controller.abort();
  }, [requestVersion]);

  function reloadWeather() {
    setWeather({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }

  return (
    <section aria-labelledby="weather-heading">
      <h2 id="weather-heading">Погода</h2>
      <p>
        Источник погодных данных: <a href="https://open-meteo.com/">Open-Meteo</a>
      </p>
      <button type="button" onClick={reloadWeather} disabled={weather.status === 'loading'}>
        Получить данные повторно
      </button>
      {weather.status === 'loading' && <p role="status">Получаем погодные данные…</p>}
      {weather.status === 'error' && <p role="alert">Не удалось получить погодные данные.</p>}
      {weather.status === 'success' && <WeatherDetails data={weather.data} />}
    </section>
  );
}
