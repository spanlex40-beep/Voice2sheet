
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  } catch (err) {
    console.error("Mount Error:", err);
    rootElement.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center; padding:20px;">
        <h2 style="color:#ef4444">Error de Inicio</h2>
        <p style="color:#64748b; margin-bottom:20px;">La App no pudo cargar correctamente.</p>
        <button onclick="window.location.reload()" style="padding:10px 20px; background:#4f46e5; color:white; border:none; border-radius:8px; font-weight:bold;">Reintentar</button>
      </div>
    `;
  }
}

// Registro del SW con ruta relativa para soportar diversos entornos de hosting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Usamos ./sw.js en lugar de /sw.js para evitar errores de origen cruzado
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW listo', reg.scope))
      .catch(err => console.error('SW Error:', err));
  });
}
