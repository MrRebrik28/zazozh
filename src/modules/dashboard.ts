import { storage } from '../core/storage';
import { DayGoal } from '../core/types';
import { todayString, formatWeekday, formatDateRu, getDaysAgo } from '../utils/date';
import { haptics } from '../utils/haptics';

export function setupDashboard() {
  const today = todayString();

  // 1. Water Tracker
  const waterContainer = document.getElementById('waterRow');
  if (waterContainer) {
    waterContainer.addEventListener('click', async (e) => {
      const target = (e.target as HTMLElement).closest('.water-cup') as HTMLElement;
      if (!target) return;
      const cupIndex = Number(target.dataset.cup);
      haptics.light();

      await storage.save((data) => {
        let check = data.checks.find((c) => c.date === today);
        if (!check) {
          check = {
            id: Date.now(),
            date: today,
            mood: '',
            sleep: null,
            energy: null,
            pain: null,
            waterGlasses: 0,
            medsTaken: false,
          };
          data.checks.unshift(check);
        }
        // Toggle or set
        if (check.waterGlasses === cupIndex) {
          check.waterGlasses = cupIndex - 1;
        } else {
          check.waterGlasses = cupIndex;
        }
      });
    });
  }

  // 2. Meds / Vitamins Toggle
  const medsBtn = document.getElementById('medsToggle');
  if (medsBtn) {
    medsBtn.addEventListener('click', async () => {
      haptics.selection();
      await storage.save((data) => {
        let check = data.checks.find((c) => c.date === today);
        if (!check) {
          check = {
            id: Date.now(),
            date: today,
            mood: '',
            sleep: null,
            energy: null,
            pain: null,
            waterGlasses: 0,
            medsTaken: false,
          };
          data.checks.unshift(check);
        }
        check.medsTaken = !check.medsTaken;
      });
    });
  }

  // 3. Goal Save & Toggle
  const goalsContainer = document.getElementById('goalsList');
  if (goalsContainer) {
    goalsContainer.addEventListener('click', async (e) => {
      const checkbox = (e.target as HTMLElement).closest('.goal-checkbox') as HTMLElement;
      if (!checkbox) return;
      const goalId = checkbox.dataset.id;
      if (!goalId) return;

      haptics.light();
      await storage.save((data) => {
        const dayStore = data.goals.find((g) => g.date === today);
        if (dayStore) {
          const goal = dayStore.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.completed = !goal.completed;
          }
        }
      });
    });
  }

  const saveGoalsBtn = document.getElementById('saveGoalsBtn');
  if (saveGoalsBtn) {
    saveGoalsBtn.addEventListener('click', async () => {
      const g1 = (document.getElementById('goalInput1') as HTMLInputElement)?.value.trim();
      const g2 = (document.getElementById('goalInput2') as HTMLInputElement)?.value.trim();
      const g3 = (document.getElementById('goalInput3') as HTMLInputElement)?.value.trim();

      const newGoals: DayGoal[] = [];
      if (g1) newGoals.push({ id: `g1-${Date.now()}`, text: g1, completed: false });
      if (g2) newGoals.push({ id: `g2-${Date.now()}`, text: g2, completed: false });
      if (g3) newGoals.push({ id: `g3-${Date.now()}`, text: g3, completed: false });

      await storage.save((data) => {
        const existing = data.goals.find((g) => g.date === today);
        if (existing) {
          existing.goals = newGoals;
        } else {
          data.goals.unshift({ date: today, goals: newGoals });
        }
      });
      haptics.success();
      showToast('План на день сохранён ✨');
    });
  }

  // 4. Pain Area Chips
  const painChips = document.querySelectorAll('.pain-chip');
  painChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      haptics.selection();
    });
  });

  // 5. Save Check-in Form
  const saveCheckBtn = document.getElementById('saveCheckBtn');
  if (saveCheckBtn) {
    saveCheckBtn.addEventListener('click', async () => {
      const checkDate = (document.getElementById('checkDate') as HTMLInputElement)?.value || today;
      const mood = (document.getElementById('mood') as HTMLSelectElement)?.value || '';
      const sleepVal = (document.getElementById('sleep') as HTMLInputElement)?.value;
      const energyVal = (document.getElementById('energy') as HTMLInputElement)?.value;
      const painVal = (document.getElementById('pain') as HTMLInputElement)?.value;
      const plan = (document.getElementById('dayPlan') as HTMLTextAreaElement)?.value || '';
      const note = (document.getElementById('todayNote') as HTMLTextAreaElement)?.value || '';

      const painAreas: string[] = [];
      document.querySelectorAll('.pain-chip.active').forEach((el) => {
        const text = el.textContent?.trim();
        if (text) painAreas.push(text);
      });

      await storage.save((data) => {
        let existing = data.checks.find((c) => c.date === checkDate);
        if (existing) {
          existing.mood = mood;
          existing.sleep = sleepVal ? Number(sleepVal) : null;
          existing.energy = energyVal ? Number(energyVal) : null;
          existing.pain = painVal !== '' && painVal !== undefined ? Number(painVal) : null;
          existing.painAreas = painAreas;
          existing.plan = plan;
          existing.note = note;
        } else {
          existing = {
            id: Date.now(),
            date: checkDate,
            mood,
            sleep: sleepVal ? Number(sleepVal) : null,
            energy: energyVal ? Number(energyVal) : null,
            pain: painVal !== '' && painVal !== undefined ? Number(painVal) : null,
            painAreas,
            waterGlasses: 0,
            medsTaken: false,
            plan,
            note,
          };
          data.checks.unshift(existing);
        }
      });

      haptics.success();
      showToast('Чек-ин бережно сохранён 🌷');
    });
  }

  // 6. Save Small Win
  const saveWinBtn = document.getElementById('saveWinBtn');
  if (saveWinBtn) {
    saveWinBtn.addEventListener('click', async () => {
      const input = document.getElementById('winInput') as HTMLTextAreaElement;
      const text = input?.value.trim();
      if (!text) return;

      await storage.save((data) => {
        data.wins.unshift({
          id: Date.now(),
          date: today,
          text,
        });
      });

      input.value = '';
      haptics.success();
      showToast('Победа сохранена в копилку 🌸');
    });
  }

  // 7. Delete Win
  const winsList = document.getElementById('winsList');
  if (winsList) {
    winsList.addEventListener('click', async (e) => {
      const delBtn = (e.target as HTMLElement).closest('.del-win') as HTMLElement;
      if (!delBtn) return;
      const id = Number(delBtn.dataset.id);
      if (!id) return;

      haptics.light();
      await storage.save((data) => {
        data.wins = data.wins.filter((w) => w.id !== id);
      });
      showToast('Запись удалена');
    });
  }

  // 8. Jump to Checkin
  const jumpBtn = document.getElementById('jumpCheckin');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      document.getElementById('checkinCard')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

export function renderDashboard() {
  const data = storage.getData();
  const today = todayString();

  // Welcome Date
  const welcomeDate = document.getElementById('welcomeDate');
  if (welcomeDate) {
    welcomeDate.textContent = formatWeekday(today);
  }

  // Today check-in stat values
  const todayCheck = data.checks.find((c) => c.date === today);
  const moodEl = document.getElementById('dashMood');
  const sleepEl = document.getElementById('dashSleep');
  const energyEl = document.getElementById('dashEnergy');
  const painEl = document.getElementById('dashPain');
  const statusEl = document.getElementById('dashStatus');

  if (moodEl) moodEl.textContent = todayCheck?.mood || '—';
  if (sleepEl) sleepEl.textContent = todayCheck?.sleep !== null && todayCheck?.sleep !== undefined ? `${todayCheck.sleep} ч` : '—';
  if (energyEl) energyEl.textContent = todayCheck?.energy !== null && todayCheck?.energy !== undefined ? `${todayCheck.energy}/10` : '—';
  if (painEl) {
    if (todayCheck?.pain !== null && todayCheck?.pain !== undefined) {
      const areaNote = todayCheck.painAreas?.length ? ` (${todayCheck.painAreas.join(', ')})` : '';
      painEl.textContent = `${todayCheck.pain}/10${areaNote}`;
    } else {
      painEl.textContent = '—';
    }
  }

  if (statusEl) {
    statusEl.textContent = todayCheck
      ? 'Чек-ин за сегодня сохранён. Можно дополнять его в течение дня.'
      : 'Чек-ин ещё не заполнен — удели себе пару минут ниже.';
  }

  // Water render (8 cups)
  const waterCount = todayCheck?.waterGlasses || 0;
  const waterCupsEl = document.getElementById('waterRow');
  if (waterCupsEl) {
    let cupsHtml = '';
    for (let i = 1; i <= 8; i++) {
      const isFilled = i <= waterCount;
      cupsHtml += `<button class="water-cup ${isFilled ? 'filled' : ''}" data-cup="${i}" title="${i} стакан">${isFilled ? '💧' : '🥛'}</button>`;
    }
    waterCupsEl.innerHTML = cupsHtml;
  }
  const waterCountEl = document.getElementById('waterCountText');
  if (waterCountEl) {
    waterCountEl.textContent = `${waterCount} из 8 стаканов (~${(waterCount * 0.25).toFixed(1)} л)`;
  }

  // Meds / Vitamins toggle state
  const medsBtn = document.getElementById('medsToggle');
  if (medsBtn) {
    if (todayCheck?.medsTaken) {
      medsBtn.className = 'btn btn-primary btn-sm';
      medsBtn.textContent = '✓ Витамины приняты';
    } else {
      medsBtn.className = 'btn btn-secondary btn-sm';
      medsBtn.textContent = '○ Принять витамины';
    }
  }

  // Goals render
  const dayGoalsStore = data.goals.find((g) => g.date === today);
  const goalsListEl = document.getElementById('goalsList');
  if (goalsListEl) {
    if (dayGoalsStore && dayGoalsStore.goals.length > 0) {
      goalsListEl.innerHTML = dayGoalsStore.goals
        .map(
          (g) => `
        <div class="goal-item">
          <div class="goal-checkbox ${g.completed ? 'checked' : ''}" data-id="${g.id}">
            ${g.completed ? '✓' : ''}
          </div>
          <span class="goal-text ${g.completed ? 'completed' : ''}">${escapeHtml(g.text)}</span>
        </div>
      `
        )
        .join('');
    } else {
      goalsListEl.innerHTML = '<div class="muted">На сегодня пока нет плана. Добавь 1–3 простых дела ниже.</div>';
    }
  }

  // Populate goal input placeholders if empty
  const goalsInputs = ['goalInput1', 'goalInput2', 'goalInput3'];
  goalsInputs.forEach((id, i) => {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input && dayGoalsStore?.goals[i]) {
      input.value = dayGoalsStore.goals[i].text;
    }
  });

  // Wins list render
  const winsListEl = document.getElementById('winsList');
  if (winsListEl) {
    if (data.wins.length > 0) {
      winsListEl.innerHTML = data.wins
        .slice(0, 5)
        .map(
          (w) => `
        <div class="entry-card">
          <div class="entry-header">
            <span class="entry-date">${formatDateRu(w.date)}</span>
            <button class="btn btn-danger btn-sm del-win" data-id="${w.id}" title="Удалить">✕</button>
          </div>
          <div class="muted">${escapeHtml(w.text)}</div>
        </div>
      `
        )
        .join('');
    } else {
      winsListEl.innerHTML = '<div class="muted">Здесь будут твои маленькие победы и поводы сказать себе «спасибо».</div>';
    }
  }

  // Week progress calculation
  const start7Str = getDaysAgo(6);
  const checksLast7 = new Set(data.checks.filter((c) => c.date >= start7Str && c.date <= today).map((c) => c.date)).size;
  const weightsLast7 = data.weights.filter((w) => w.date >= start7Str && w.date <= today).length;

  const weekChecksEl = document.getElementById('weekChecks');
  const weekWeightsEl = document.getElementById('weekWeights');
  const weekBarEl = document.getElementById('weekBar');
  const weekSummaryEl = document.getElementById('weekSummary');

  if (weekChecksEl) weekChecksEl.textContent = `${checksLast7} / 7`;
  if (weekWeightsEl) weekWeightsEl.textContent = String(weightsLast7);
  if (weekBarEl) weekBarEl.style.width = `${Math.min(100, Math.round((checksLast7 / 7) * 100))}%`;
  if (weekSummaryEl) {
    weekSummaryEl.textContent = checksLast7 > 0
      ? `Ты уделила внимание себе в ${checksLast7} из последних 7 дней. Это замечательно!`
      : 'Каждая отметка — уже шаг к заботе о себе.';
  }

  // Prefill Check-in form for selected date
  const checkDateInput = document.getElementById('checkDate') as HTMLInputElement;
  if (checkDateInput && !checkDateInput.value) {
    checkDateInput.value = today;
  }
}

export function showToast(message: string) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast?.classList.remove('visible');
  }, 2400);
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
