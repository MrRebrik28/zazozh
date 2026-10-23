import { storage } from '../core/storage';
import { formatDateRu, todayString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { showToast } from './dashboard';

let timerInterval: any = null;
let timerSecondsLeft = 0;

export function setupWorkouts() {
  const today = todayString();
  const dateInput = document.getElementById('workoutDate') as HTMLInputElement;
  if (dateInput && !dateInput.value) {
    dateInput.value = today;
  }

  // Save Workout
  document.getElementById('saveWorkoutBtn')?.addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.exercise-checkbox:checked')) as HTMLInputElement[];
    const items = checked.map((c) => c.value);
    const note = (document.getElementById('workoutNote') as HTMLTextAreaElement)?.value.trim() || '';
    const date = (document.getElementById('workoutDate') as HTMLInputElement)?.value || today;

    if (items.length === 0 && !note) {
      showToast('Выбери упражнение или напиши заметку');
      return;
    }

    await storage.save((data) => {
      data.workouts.unshift({
        id: Date.now(),
        date,
        items,
        note,
      });
    });

    checked.forEach((c) => (c.checked = false));
    const noteEl = document.getElementById('workoutNote') as HTMLTextAreaElement;
    if (noteEl) noteEl.value = '';

    haptics.success();
    showToast('Комплекс сохранён 🌿');
  });

  // Add Custom Exercise
  document.getElementById('addExerciseBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('customExerciseInput') as HTMLInputElement;
    const name = input?.value.trim();
    if (!name) return;

    await storage.save((data) => {
      if (!data.customExercises.includes(name)) {
        data.customExercises.push(name);
      }
    });

    input.value = '';
    haptics.light();
    showToast('Упражнение добавлено в список ✨');
  });

  // Timer Buttons
  document.querySelectorAll('.timer-preset').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const minutes = Number((e.currentTarget as HTMLElement).dataset.mins);
      startTimer(minutes * 60);
      haptics.selection();
    });
  });

  document.getElementById('timerResetBtn')?.addEventListener('click', () => {
    resetTimer();
    haptics.light();
  });
}

function startTimer(seconds: number) {
  clearInterval(timerInterval);
  timerSecondsLeft = seconds;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerSecondsLeft--;
    if (timerSecondsLeft <= 0) {
      clearInterval(timerInterval);
      timerSecondsLeft = 0;
      updateTimerDisplay();
      haptics.success();
      showToast('Время отдыха / дыхания завершено 🧘‍♀️');
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerSecondsLeft = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  const m = Math.floor(timerSecondsLeft / 60);
  const s = timerSecondsLeft % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderWorkouts() {
  const data = storage.getData();

  // Exercise checkboxes
  const listEl = document.getElementById('exerciseCheckboxes');
  if (listEl) {
    listEl.innerHTML = data.customExercises
      .map(
        (ex) => `
      <label class="goal-item" style="cursor:pointer">
        <input type="checkbox" class="exercise-checkbox" value="${escapeHtml(ex)}" style="width:20px;height:20px;accent-color:var(--accent);margin:0">
        <span class="goal-text">${escapeHtml(ex)}</span>
      </label>
    `
      )
      .join('');
  }

  // Workouts History
  const historyEl = document.getElementById('workoutHistoryList');
  if (historyEl) {
    if (data.workouts.length > 0) {
      historyEl.innerHTML = data.workouts
        .map(
          (w) => `
        <div class="entry-card">
          <div class="entry-header">
            <span class="entry-date">${formatDateRu(w.date)}</span>
            <button class="btn btn-danger btn-sm del-workout-entry" data-id="${w.id}">✕</button>
          </div>
          <div>
            ${w.items.length ? `<div>${w.items.map((it) => `<span class="badge" style="margin:2px">${escapeHtml(it)}</span>`).join(' ')}</div>` : ''}
            ${w.note ? `<div class="muted" style="margin-top:4px">${escapeHtml(w.note)}</div>` : ''}
          </div>
        </div>
      `
        )
        .join('');

      historyEl.querySelectorAll('.del-workout-entry').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = Number((e.currentTarget as HTMLElement).dataset.id);
          if (confirm('Удалить эту тренировку?')) {
            await storage.save((d) => {
              d.workouts = d.workouts.filter((w) => w.id !== id);
            });
            showToast('Тренировка удалена');
          }
        });
      });
    } else {
      historyEl.innerHTML = '<div class="muted">Выполненные комплексы появятся здесь.</div>';
    }
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
}
