export type MoodOption = '😊 Отличное' | '🙂 Хорошее' | '😐 Нормальное' | '😔 Грустное' | '😣 Тревожное';

export interface CheckIn {
  id: number;
  date: string; // YYYY-MM-DD
  mood: string;
  sleep: number | null;
  energy: number | null; // 1-10
  pain: number | null;   // 0-10
  painAreas?: string[];  // e.g. ['Шея', 'Спина']
  waterGlasses?: number; // 0-12
  medsTaken?: boolean;
  plan?: string;
  note?: string;
}

export interface DayGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface DayGoalsStore {
  date: string;
  goals: DayGoal[];
}

export interface WorkoutEntry {
  id: number;
  date: string;
  items: string[];
  durationMinutes?: number;
  note?: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface MeasureEntry {
  date: string;
  waist?: number;
  hips?: number;
  thigh?: number;
  chest?: number;
  bicep?: number;
  note?: string;
}

export interface WinEntry {
  id: number;
  date: string;
  text: string;
}

export interface AppData {
  checks: CheckIn[];
  workouts: WorkoutEntry[];
  weights: WeightEntry[];
  measures: MeasureEntry[];
  goals: DayGoalsStore[];
  wins: WinEntry[];
  customExercises: string[];
}

export interface AppBackupV1V2 {
  app: string;
  version?: number;
  exportedAt?: string;
  data: {
    checks: any[];
    workouts: any[];
    weights: any[];
    measures: any[];
  };
  extras?: {
    goals?: string[];
    wins?: any[];
  };
}

export interface AppBackupV3 {
  app: 'Моё восстановление';
  version: 3;
  exportedAt: string;
  data: AppData;
}
