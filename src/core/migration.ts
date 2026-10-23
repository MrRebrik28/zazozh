import { AppData, CheckIn, WorkoutEntry, WeightEntry, MeasureEntry, WinEntry, DayGoalsStore } from './types';

export const DEFAULT_EXERCISES = [
  'Спокойная прогулка',
  'Мягкая разминка плеч и шеи',
  'Дыхание и расслабление',
  'Лёгкая растяжка без боли',
  'Мягкая мобильность тазобедренных суставов',
  'Комплекс для спины (кошка / собака)',
];

export function getEmptyAppData(): AppData {
  return {
    checks: [],
    workouts: [],
    weights: [],
    measures: [],
    goals: [],
    wins: [],
    customExercises: [...DEFAULT_EXERCISES],
  };
}

export function normalizeBackup(raw: any): AppData {
  const result = getEmptyAppData();
  if (!raw || typeof raw !== 'object') return result;

  const rawData = raw.data || raw;

  // 1. Checks
  if (Array.isArray(rawData.checks)) {
    result.checks = rawData.checks.map((c: any, index: number): CheckIn => ({
      id: Number(c.id) || Date.now() - index * 1000,
      date: String(c.date || new Date().toISOString().slice(0, 10)),
      mood: String(c.mood || ''),
      sleep: c.sleep !== null && c.sleep !== undefined && c.sleep !== '' ? Number(c.sleep) : null,
      energy: c.energy !== null && c.energy !== undefined && c.energy !== '' ? Number(c.energy) : null,
      pain: c.pain !== null && c.pain !== undefined && c.pain !== '' ? Number(c.pain) : null,
      painAreas: Array.isArray(c.painAreas) ? c.painAreas.map(String) : [],
      waterGlasses: Number(c.waterGlasses) || 0,
      medsTaken: Boolean(c.medsTaken),
      plan: String(c.plan || ''),
      note: String(c.note || ''),
    }));
  }

  // 2. Workouts
  if (Array.isArray(rawData.workouts)) {
    result.workouts = rawData.workouts.map((w: any, index: number): WorkoutEntry => ({
      id: Number(w.id) || Date.now() - index * 1000,
      date: String(w.date || new Date().toISOString().slice(0, 10)),
      items: Array.isArray(w.items) ? w.items.map(String) : [],
      durationMinutes: w.durationMinutes ? Number(w.durationMinutes) : undefined,
      note: String(w.note || ''),
    }));
  }

  // 3. Weights
  if (Array.isArray(rawData.weights)) {
    result.weights = rawData.weights
      .map((w: any): WeightEntry => ({
        date: String(w.date || ''),
        weight: Number(w.weight) || 0,
      }))
      .filter((w: WeightEntry) => w.date && w.weight > 0)
      .sort((a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date));
  }

  // 4. Measures
  if (Array.isArray(rawData.measures)) {
    result.measures = rawData.measures.map((m: any): MeasureEntry => ({
      date: String(m.date || ''),
      waist: m.waist ? Number(m.waist) : undefined,
      hips: m.hips ? Number(m.hips) : undefined,
      thigh: m.thigh ? Number(m.thigh) : undefined,
      chest: m.chest ? Number(m.chest) : undefined,
      bicep: m.bicep ? Number(m.bicep) : undefined,
      note: String(m.note || ''),
    }));
  }

  // 5. Goals
  if (Array.isArray(rawData.goals)) {
    result.goals = rawData.goals;
  } else if (raw.extras?.goals && Array.isArray(raw.extras.goals)) {
    // Migration from v1/v2 flat goals: string[]
    const today = new Date().toISOString().slice(0, 10);
    const dayGoals: DayGoalsStore = {
      date: today,
      goals: raw.extras.goals
        .filter((g: any) => typeof g === 'string' && g.trim())
        .map((text: string, idx: number) => ({
          id: `g-${idx}-${Date.now()}`,
          text: text.trim(),
          completed: false,
        })),
    };
    if (dayGoals.goals.length > 0) {
      result.goals = [dayGoals];
    }
  }

  // 6. Wins
  const rawWins = raw.extras?.wins || rawData.wins;
  if (Array.isArray(rawWins)) {
    result.wins = rawWins.map((w: any, idx: number): WinEntry => ({
      id: Number(w.id) || Date.now() - idx * 1000,
      date: String(w.date || new Date().toISOString().slice(0, 10)),
      text: typeof w === 'string' ? w : String(w.text || ''),
    })).filter((w) => w.text.trim().length > 0);
  }

  // 7. Custom Exercises
  if (Array.isArray(rawData.customExercises) && rawData.customExercises.length > 0) {
    result.customExercises = Array.from(new Set([...rawData.customExercises, ...DEFAULT_EXERCISES]));
  }

  return result;
}
