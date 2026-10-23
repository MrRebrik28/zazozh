declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export const haptics = {
  light() {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        return;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
  },

  medium() {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        return;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    } catch {}
  },

  success() {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        return;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate([15, 30, 15]);
      }
    } catch {}
  },

  selection() {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
        return;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(5);
      }
    } catch {}
  },
};
