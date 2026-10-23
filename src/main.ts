import { storage } from './core/storage';
import { setupDashboard, renderDashboard } from './modules/dashboard';
import { setupCalendar, renderCalendar } from './modules/calendar';
import { setupWorkouts, renderWorkouts } from './modules/workouts';
import { setupDynamics, renderDynamics } from './modules/dynamics';
import { setupBody, renderBody } from './modules/body';
import { setupPassport, renderPassport } from './modules/passport';
import { haptics } from './utils/haptics';

async function initApp() {
  // 1. Initialize Telegram WebApp if running in Telegram
  if (window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    } catch (e) {
      console.warn('Telegram WebApp init note:', e);
    }
  }

  // 2. Initialize Theme
  const savedTheme = localStorage.getItem('zazozh_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggle = document.getElementById('themeToggle');
  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zazozh_theme', next);
    updateThemeIcon(next);
    haptics.selection();
  });

  // 3. Tab Navigation
  const navButtons = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.panel');

  function switchTab(tabId: string) {
    navButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isTarget);
    });

    panels.forEach((p) => {
      const isTarget = p.id === tabId;
      p.classList.toggle('active', isTarget);
    });

    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'dynamics') renderDynamics();
    if (tabId === 'workouts') renderWorkouts();
    if (tabId === 'body') renderBody();
    if (tabId === 'passport') renderPassport();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) {
        haptics.selection();
        switchTab(tab);
      }
    });
  });

  // Delegate quick jump buttons with data-gotab
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-gotab]') as HTMLElement;
    if (target) {
      const tab = target.getAttribute('data-gotab');
      if (tab) {
        haptics.light();
        switchTab(tab);
      }
    }
  });

  // 4. Setup Module Handlers
  setupDashboard();
  setupCalendar();
  setupWorkouts();
  setupDynamics();
  setupBody();
  setupPassport();

  // 5. Initialize Storage and Load State
  await storage.init();

  // 6. Subscribe to State Changes for automatic re-rendering
  storage.subscribe(() => {
    renderDashboard();
    renderCalendar();
    renderWorkouts();
    renderDynamics();
    renderBody();
    renderPassport();
  });

  // Initial render
  renderDashboard();

  // 7. Register Service Worker for offline PWA
  if ('serviceWorker' in navigator && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW register error:', err);
    });
  }
}

function updateThemeIcon(theme: string) {
  const iconEl = document.getElementById('themeIcon');
  if (iconEl) {
    iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
