import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from '@/pages/home';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Не найден корневой элемент приложения');
}

createRoot(root).render(
  <StrictMode>
    <HomePage />
  </StrictMode>,
);
