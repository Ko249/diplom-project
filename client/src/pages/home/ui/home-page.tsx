import { useEffect, useState } from 'react';
import { getServerHealth } from '../api/get-server-health';

const statusMessages = {
  checking: 'Проверяем доступность сервера…',
  ok: 'Сервер работает',
  unavailable: 'Не удалось проверить состояние сервера',
};

export function HomePage() {
  const [status, setStatus] = useState<keyof typeof statusMessages>('checking');

  useEffect(() => {
    const controller = new AbortController();

    void getServerHealth(controller.signal)
      .then((health) => {
        if (!controller.signal.aborted) {
          setStatus(health.status);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus('unavailable');
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Умный дом</h1>
      <p>Система управления микроклиматом и энергопотреблением.</p>
      <p role="status">{statusMessages[status]}</p>
    </main>
  );
}
