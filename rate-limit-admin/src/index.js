import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress benign ResizeObserver loop error (Chrome quirk) so it doesn't surface in overlay
(function() {
  const ignoredMsg = 'ResizeObserver loop completed with undelivered notifications.';
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes(ignoredMsg)) {
      e.preventDefault();
    }
  });
  const origConsoleError = console.error;
  console.error = function(...args) {
    if (args.length && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed')) return;
    origConsoleError.apply(console, args);
  };
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
