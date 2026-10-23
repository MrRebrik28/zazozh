import { storage } from '../core/storage';
import { formatDateRu, todayString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { showToast } from './dashboard';

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth(); // 0-11
let selectedDate = todayString();

export function setupCalendar() {
  document.getElementById('calPrevMonth')?.addEventListener('click', () => {
    currentCalMonth--;
    if (currentCalMonth < 0) {
      currentCalMonth = 11;
      currentCalYear--;
    }
    haptics.selection();
    renderCalendar();
  });

  document.getElementById('calNextMonth')?.addEventListener('click', () => {
    currentCalMonth++;
    if (currentCalMonth > 11) {
      currentCalMonth = 0;
      currentCalYear++;
    }
    haptics.selection();
    renderCalendar();
  });

  document.getElementById('calGrid')?.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest('.cal-cell') as HTMLElement;
    if (!cell || !cell.dataset.date) return;
    selectedDate = cell.dataset.date;
    haptics.light();
    renderCalendar();
    renderDayDetails(selectedDate);
  });
}

export function renderCalendar() {
  const data = storage.getData();
  const today = todayString();

  const titleEl = document.getElementById('calMonthTitle');
  if (titleEl) {
    const monthDate = new Date(currentCalYear, currentCalMonth, 1);
    titleEl.textContent = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  const gridEl = document.getElementById('calGrid');
  if (!gridEl) return;

  const firstDayIndex = (new Date(currentCalYear, currentCalMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  let html = dayNames.map((d) => `<div class="cal-day-name">${d}</div>`).join('');

  // Leading empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    html += '<div class="cal-cell-empty"></div>';
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentCalMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${currentCalYear}-${monthStr}-${dayStr}`;

    const isToday = dateKey === today;
    const isSelected = dateKey === selectedDate;

    const hasCheck = data.checks.some((c) => c.date === dateKey);
    const hasWorkout = data.workouts.some((w) => w.date === dateKey);
    const hasWeight = data.weights.some((w) => w.date === dateKey);

    let dotsHtml = '';
    if (hasCheck) dotsHtml += '<span class="cal-dot" title="Чек-ин"></span>';
    if (hasWorkout) dotsHtml += '<span class="cal-dot" style="background:var(--success)" title="Тренировка"></span>';
    if (hasWeight) dotsHtml += '<span class="cal-dot" style="background:#5594b8" title="Вес"></span>';

    html += `
      <div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateKey}">
        <span>${day}</span>
        ${dotsHtml ? `<div class="cal-dots">${dotsHtml}</div>` : ''}
      </div>
    `;
  }

  gridEl.innerHTML = html;
  renderDayDetails(selectedDate);
}

function renderDayDetails(dateStr: string) {
  const container = document.getElementById('dayDetailsContent');
  if (!container) return;

  const data = storage.getData();
  const check = data.checks.find((c) => c.date === dateStr);
  const workouts = data.workouts.filter((w) => w.date === dateStr);
  const weight = data.weights.find((w) => w.date === dateStr);
  const measure = data.measures.find((m) => m.date === dateStr);

  const dateTitleEl = document.getElementById('selectedDateTitle');
  if (dateTitleEl) {
    dateTitleEl.textContent = formatDateRu(dateStr);
  }

  if (!check && workouts.length === 0 && !weight && !measure) {
    container.innerHTML = '<div class="muted">На этот день записей пока нет.</div>';
    return;
  }

  let html = '';

  if (check) {
    html += `
      <div class="entry-card">
        <div class="entry-header">
          <span class="badge">Чек-ин дня</span>
          <button class="btn btn-danger btn-sm del-check" data-id="${check.id}">Удалить</button>
        </div>
        <div>
          ${check.mood ? `<strong>Настроение:</strong> ${check.mood}<br>` : ''}
          ${check.sleep !== null && check.sleep !== undefined ? `<strong>Сон:</strong> ${check.sleep} ч<br>` : ''}
          ${check.energy !== null && check.energy !== undefined ? `<strong>Энергия:</strong> ${check.energy}/10<br>` : ''}
          ${check.pain !== null && check.pain !== undefined ? `<strong>Боль:</strong> ${check.pain}/10 ${check.painAreas?.length ? `(${check.painAreas.join(', ')})` : ''}<br>` : ''}
          ${check.waterGlasses ? `<strong>Вода:</strong> ${check.waterGlasses} стаканов<br>` : ''}
          ${check.medsTaken ? '<strong>Витамины:</strong> приняты ✓<br>' : ''}
          ${check.plan ? `<strong>План:</strong> ${check.plan}<br>` : ''}
          ${check.note ? `<strong>Заметка:</strong> ${check.note}<br>` : ''}
        </div>
      </div>
    `;
  }

  if (workouts.length > 0) {
    workouts.forEach((w) => {
      html += `
        <div class="entry-card">
          <div class="entry-header">
            <span class="badge" style="background:var(--success-soft);color:var(--success)">Тренировка</span>
            <button class="btn btn-danger btn-sm del-workout" data-id="${w.id}">Удалить</button>
          </div>
          <div>
            <strong>Упражнения:</strong> ${w.items.join(', ') || 'Без названий'}<br>
            ${w.note ? `<strong>Заметка:</strong> ${w.note}` : ''}
          </div>
        </div>
      `;
    });
  }

  if (weight) {
    html += `
      <div class="entry-card">
        <div class="entry-header">
          <span class="badge" style="background:#e8f2f8;color:#2b6688">Вес</span>
          <button class="btn btn-danger btn-sm del-weight" data-date="${weight.date}">Удалить</button>
        </div>
        <div><strong>Вес:</strong> ${weight.weight} кг</div>
      </div>
    `;
  }

  if (measure) {
    const parts = [
      measure.waist ? `Талия: ${measure.waist} см` : '',
      measure.hips ? `Бёдра: ${measure.hips} см` : '',
      measure.thigh ? `Бедро: ${measure.thigh} см` : '',
      measure.chest ? `Грудь: ${measure.chest} см` : '',
      measure.bicep ? `Рука: ${measure.bicep} см` : '',
    ].filter(Boolean);

    html += `
      <div class="entry-card">
        <div class="entry-header">
          <span class="badge">Замеры тела</span>
          <button class="btn btn-danger btn-sm del-measure" data-date="${measure.date}">Удалить</button>
        </div>
        <div>${parts.join(' · ')}<br>${measure.note ? `<strong>Заметка:</strong> ${measure.note}` : ''}</div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Bind delete handlers
  container.querySelectorAll('.del-check').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = Number((e.currentTarget as HTMLElement).dataset.id);
      if (confirm('Удалить этот чек-ин?')) {
        await storage.save((d) => {
          d.checks = d.checks.filter((c) => c.id !== id);
        });
        showToast('Чек-ин удалён');
      }
    });
  });

  container.querySelectorAll('.del-workout').forEach((btn) => {
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

  container.querySelectorAll('.del-weight').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const dStr = (e.currentTarget as HTMLElement).dataset.date;
      if (confirm('Удалить запись веса?')) {
        await storage.save((d) => {
          d.weights = d.weights.filter((w) => w.date !== dStr);
        });
        showToast('Запись веса удалена');
      }
    });
  });

  container.querySelectorAll('.del-measure').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const dStr = (e.currentTarget as HTMLElement).dataset.date;
      if (confirm('Удалить запись замеров?')) {
        await storage.save((d) => {
          d.measures = d.measures.filter((m) => m.date !== dStr);
        });
        showToast('Замеры удалены');
      }
    });
  });
}
