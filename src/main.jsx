import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './bm-styles.css'
import App from './App.jsx'

// Intercept global fetch calls to automatically append the X-User-Id header if a user is logged in
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  let savedUser = null;
  try {
    const raw = localStorage.getItem('epic_user') || sessionStorage.getItem('epic_user');
    if (raw && raw !== 'undefined' && raw !== 'null') {
      savedUser = JSON.parse(raw);
    }
  } catch (e) {
    // Ignore invalid JSON token
  }

  if (savedUser && savedUser.id) {
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      options.headers.set('X-User-Id', String(savedUser.id));
    } else if (Array.isArray(options.headers)) {
      const idx = options.headers.findIndex(h => h[0].toLowerCase() === 'x-user-id');
      if (idx !== -1) {
        options.headers[idx][1] = String(savedUser.id);
      } else {
        options.headers.push(['X-User-Id', String(savedUser.id)]);
      }
    } else {
      options.headers['X-User-Id'] = String(savedUser.id);
    }
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

