export async function getServerHealth(signal: AbortSignal): Promise<{ status: 'ok' }> {
  const response = await fetch('/api/health', { signal });

  if (!response.ok) {
    throw new Error(`Проверка состояния сервера завершилась с HTTP ${response.status}`);
  }

  const data = await response.json();

  if (typeof data !== 'object' || data === null || data.status !== 'ok') {
    throw new Error('Неожиданный ответ при проверке состояния сервера');
  }

  return { status: data.status };
}
