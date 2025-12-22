
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
const loader = document.getElementById('app-loader');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    
    // Eliminar el loader una vez renderizado
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 300);
    }
  } catch (err) {
    console.error("Error montando React:", err);
    if (loader) loader.innerHTML = `<p style="color:red; padding:20px; text-align:center;">Error al iniciar. Por favor limpia la caché de tu navegador y recarga.</p>`;
  }
}
