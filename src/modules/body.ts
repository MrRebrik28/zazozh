import { storage } from '../core/storage';
import { formatDateRu, todayString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { showToast } from './dashboard';

export function setupBody() {
  const today = todayString();
  const dateInput = document.getElementById('measureDate') as HTMLInputElement;
  if (dateInput && !dateInput.value) {
    dateInput.value = today;
  }

  // Save Measurements
  document.getElementById('saveMeasureBtn')?.addEventListener('click', async () => {
    const date = (document.getElementById('measureDate') as HTMLInputElement)?.value || today;
    const waist = parseFloat((document.getElementById('waist') as HTMLInputElement)?.value || '');
    const hips = parseFloat((document.getElementById('hips') as HTMLInputElement)?.value || '');
    const thigh = parseFloat((document.getElementById('thigh') as HTMLInputElement)?.value || '');
    const chest = parseFloat((document.getElementById('chest') as HTMLInputElement)?.value || '');
    const bicep = parseFloat((document.getElementById('bicep') as HTMLInputElement)?.value || '');
    const note = (document.getElementById('measureNote') as HTMLTextAreaElement)?.value.trim() || '';

    if (isNaN(waist) && isNaN(hips) && isNaN(thigh) && isNaN(chest) && isNaN(bicep) && !note) {
      showToast('Заполни хотя бы один замер или заметку');
      return;
    }

    await storage.save((data) => {
      // If measure already exists for date, update or unshift
      const existing = data.measures.find((m) => m.date === date);
      if (existing) {
        if (!isNaN(waist)) existing.waist = waist;
        if (!isNaN(hips)) existing.hips = hips;
        if (!isNaN(thigh)) existing.thigh = thigh;
        if (!isNaN(chest)) existing.chest = chest;
        if (!isNaN(bicep)) existing.bicep = bicep;
        if (note) existing.note = note;
      } else {
        data.measures.unshift({
          date,
          waist: !isNaN(waist) ? waist : undefined,
          hips: !isNaN(hips) ? hips : undefined,
          thigh: !isNaN(thigh) ? thigh : undefined,
          chest: !isNaN(chest) ? chest : undefined,
          bicep: !isNaN(bicep) ? bicep : undefined,
          note: note || undefined,
        });
      }
    });

    ['waist', 'hips', 'thigh', 'chest', 'bicep', 'measureNote'].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
      if (el) el.value = '';
    });

    haptics.success();
    showToast('Замеры сохранены 🌸');
  });
}

export function renderBody() {
  const data = storage.getData();
  const historyEl = document.getElementById('measureHistoryList');
  if (!historyEl) return;

  if (data.measures.length > 0) {
    historyEl.innerHTML = data.measures
      .map((m) => {
        const parts = [
          m.waist ? `Талия: ${m.waist} см` : '',
          m.hips ? `Бёдра: ${m.hips} см` : '',
          m.thigh ? `Бедро: ${m.thigh} см` : '',
          m.chest ? `Грудь: ${m.chest} см` : '',
          m.bicep ? `Рука: ${m.bicep} см` : '',
        ].filter(Boolean);

        return `
          <div class="entry-card">
            <div class="entry-header">
              <span class="entry-date">${formatDateRu(m.date)}</span>
              <button class="btn btn-danger btn-sm del-measure-entry" data-date="${m.date}">✕</button>
            </div>
            <div>
              ${parts.length ? `<div style="font-weight:600">${parts.join(' · ')}</div>` : ''}
              ${m.note ? `<div class="muted" style="margin-top:4px">${escapeHtml(m.note)}</div>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    historyEl.querySelectorAll('.del-measure-entry').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const dStr = (e.currentTarget as HTMLElement).dataset.date;
        if (confirm('Удалить эту запись замеров?')) {
          await storage.save((d) => {
            d.measures = d.measures.filter((m) => m.date !== dStr);
          });
          showToast('Запись удалена');
        }
      });
    });
  } else {
    historyEl.innerHTML = '<div class="muted">Замеры тела появятся здесь.</div>';
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
