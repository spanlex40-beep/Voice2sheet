
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Forzar eliminación del loader inmediatamente al entrar al script
const loader = document.getElementById('app-loader');
if (loader) {
  // Pequeño delay para asegurar que el DOM está listo
  setTimeout(() => loader.remove(), 100);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
