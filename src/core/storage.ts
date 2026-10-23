import { AppData, AppBackupV3 } from './types';
import { getEmptyAppData, normalizeBackup } from './migration';

const DB_NAME = 'zazozh_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'current_data';
const LS_V3_KEY = 'zazozh_app_data_v3';
const LS_LEGACY_KEY = 'moeVosstanovlenie_v1';
const LS_LEGACY_GOALS = 'moeVosstanovlenie_goals_v1';
const LS_LEGACY_WINS = 'moeVosstanovlenie_wins_v1';

type Listener = (data: AppData) => void;

class StorageService {
  private memoryData: AppData = getEmptyAppData();
  private listeners: Set<Listener> = new Set();
  private isInitialized = false;

  public async init(): Promise<AppData> {
    if (this.isInitialized) return this.memoryData;

    try {
      // 1. Try reading from IndexedDB
      const idbData = await this.readFromIndexedDB();
      if (idbData && idbData.checks) {
        this.memoryData = normalizeBackup({ data: idbData });
      } else {
        // 2. Try reading from LocalStorage v3
        const lsV3 = localStorage.getItem(LS_V3_KEY);
        if (lsV3) {
          const parsed = JSON.parse(lsV3);
          this.memoryData = normalizeBackup({ data: parsed });
        } else {
          // 3. Try reading legacy localStorage
          const legacyMain = localStorage.getItem(LS_LEGACY_KEY);
          if (legacyMain) {
            const parsedMain = JSON.parse(legacyMain);
            const legacyGoals = localStorage.getItem(LS_LEGACY_GOALS);
            const legacyWins = localStorage.getItem(LS_LEGACY_WINS);
            const combined = {
              app: 'Моё восстановление',
              version: 2,
              data: parsedMain,
              extras: {
                goals: legacyGoals ? JSON.parse(legacyGoals) : [],
                wins: legacyWins ? JSON.parse(legacyWins) : [],
              },
            };
            this.memoryData = normalizeBackup(combined);
          } else {
            this.memoryData = getEmptyAppData();
          }
        }
      }
    } catch (e) {
      console.warn('Storage init fallback to empty state:', e);
      this.memoryData = getEmptyAppData();
    }

    this.isInitialized = true;
    await this.persist();
    return this.memoryData;
  }

  public getData(): AppData {
    return this.memoryData;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.memoryData);
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    }
  }

  public async save(updater: (current: AppData) => AppData | void): Promise<void> {
    const updated = updater(this.memoryData);
    if (updated) {
      this.memoryData = updated;
    }
    await this.persist();
    this.notify();
  }

  private async persist(): Promise<void> {
    // Save to LocalStorage immediately
    try {
      localStorage.setItem(LS_V3_KEY, JSON.stringify(this.memoryData));
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }

    // Save to IndexedDB asynchronously
    try {
      await this.writeToIndexedDB(this.memoryData);
    } catch (err) {
      console.warn('IndexedDB save failed:', err);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async readFromIndexedDB(): Promise<AppData | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve((req.result as AppData) || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async writeToIndexedDB(data: AppData): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(data, STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB write error:', e);
    }
  }

  public exportBackup(): string {
    const backup: AppBackupV3 = {
      app: 'Моё восстановление',
      version: 3,
      exportedAt: new Date().toISOString(),
      data: this.memoryData,
    };
    return JSON.stringify(backup, null, 2);
  }

  public async importBackup(rawJson: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(rawJson);
      const normalized = normalizeBackup(parsed);
      this.memoryData = normalized;
      await this.persist();
      this.notify();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  public async clearAll(): Promise<void> {
    this.memoryData = getEmptyAppData();
    await this.persist();
    try {
      localStorage.removeItem(LS_LEGACY_KEY);
      localStorage.removeItem(LS_LEGACY_GOALS);
      localStorage.removeItem(LS_LEGACY_WINS);
    } catch {}
    this.notify();
  }
}

export const storage = new StorageService();
