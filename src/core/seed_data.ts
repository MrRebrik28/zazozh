import { normalizeBackup } from './migration';
import { AppData } from './types';

export const INITIAL_BACKUP_JSON = {
  app: 'Моё восстановление',
  version: 1,
  exportedAt: '2026-10-22T12:41:46.331Z',
  data: {
    checks: [
      {
        id: 1792601060994,
        date: '2026-10-21',
        mood: '😐 Нормальное',
        sleep: '8',
        energy: '6',
        pain: '0',
        plan: 'Дала',
        note: 'Лалал',
      },
    ],
    workouts: [
      {
        id: 1792601060995,
        date: '2026-10-22',
        items: ['Мягкая разминка плеч и шеи', 'Дыхание и расслабление'],
        note: '',
      },
      {
        id: 1792601060996,
        date: '2026-10-22',
        items: [
          'Спокойная прогулка',
          'Мягкая разминка плеч и шеи',
          'Дыхание и расслабление',
          'Лёгкая растяжка без боли',
        ],
        note: '',
      },
      {
        id: 1792601060997,
        date: '2026-10-21',
        items: ['Спокойная прогулка'],
        note: 'Хорошо',
      },
    ],
    weights: [
      {
        date: '2026-09-16',
        weight: 48.8,
      },
      {
        date: '2026-10-21',
        weight: 47,
      },
    ],
    measures: [],
  },
};

export function getInitialSeedData(): AppData {
  return normalizeBackup(INITIAL_BACKUP_JSON);
}
