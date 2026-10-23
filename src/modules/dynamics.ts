import { storage } from '../core/storage';
import { formatDateRu, formatDateShort, todayString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { showToast } from './dashboard';

type PeriodFilter = '7d' | '30d' | '90d' | 'all';
type MetricType = 'weight' | 'sleep' | 'pain';

let currentPeriod: PeriodFilter = '30d';
let currentMetric: MetricType = 'weight';

export function setupDynamics() {
  const today = todayString();
  const weightDateInput = document.getElementById('weightDate') as HTMLInputElement;
  if (weightDateInput && !weightDateInput.value) {
    weightDateInput.value = today;
  }

  // Save Weight
  document.getElementById('saveWeightBtn')?.addEventListener('click', async () => {
    const valInput = document.getElementById('weightVal') as HTMLInputElement;
    const dateInput = document.getElementById('weightDate') as HTMLInputElement;
    const w = parseFloat(valInput?.value || '');
    const date = dateInput?.value || today;

    if (!w || w <= 0 || isNaN(w)) {
      showToast('Введи корректный вес в кг');
      return;
    }

    await storage.save((data) => {
      // If already has entry for this date, update it, else push
      const existing = data.weights.find((item) => item.date === date);
      if (existing) {
        existing.weight = w;
      } else {
        data.weights.push({ date, weight: w });
      }
      data.weights.sort((a, b) => a.date.localeCompare(b.date));
    });

    if (valInput) valInput.value = '';
    haptics.success();
    showToast('Вес сохранён ⚖️');
  });

  // Period Filters
  document.querySelectorAll('.period-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      currentPeriod = (target.dataset.period as PeriodFilter) || '30d';
      haptics.selection();
      renderDynamics();
    });
  });

  // Metric Switcher
  document.querySelectorAll('.metric-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.metric-btn').forEach((b) => b.classList.remove('active'));
      const target = e.currentTarget as HTMLElement;
      target.classList.add('active');
      currentMetric = (target.dataset.metric as MetricType) || 'weight';
      haptics.selection();
      renderDynamics();
    });
  });

  window.addEventListener('resize', () => {
    drawChart();
  });
}

export function renderDynamics() {
  const data = storage.getData();

  // Weight History
  const historyEl = document.getElementById('weightHistoryList');
  if (historyEl) {
    if (data.weights.length > 0) {
      historyEl.innerHTML = data.weights
        .slice()
        .reverse()
        .map(
          (w) => `
        <div class="entry-card">
          <div class="entry-header">
            <span class="entry-date">${formatDateRu(w.date)}</span>
            <button class="btn btn-danger btn-sm del-weight-entry" data-date="${w.date}">✕</button>
          </div>
          <div><strong>${w.weight} кг</strong></div>
        </div>
      `
        )
        .join('');

      historyEl.querySelectorAll('.del-weight-entry').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const dStr = (e.currentTarget as HTMLElement).dataset.date;
          if (confirm('Удалить эту запись веса?')) {
            await storage.save((d) => {
              d.weights = d.weights.filter((w) => w.date !== dStr);
            });
            showToast('Запись удалена');
          }
        });
      });
    } else {
      historyEl.innerHTML = '<div class="muted">Записи веса будут отображаться здесь.</div>';
    }
  }

  drawChart();
}

function drawChart() {
  const canvas = document.getElementById('dynamicsChart') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // High-DPI scaling
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 600;
  const height = 220;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const data = storage.getData();

  // Prepare points according to current metric and period
  let rawPoints: { date: string; value: number }[] = [];

  if (currentMetric === 'weight') {
    rawPoints = data.weights.map((w) => ({ date: w.date, value: w.weight }));
  } else if (currentMetric === 'sleep') {
    rawPoints = data.checks
      .filter((c) => c.sleep !== null && c.sleep !== undefined)
      .map((c) => ({ date: c.date, value: c.sleep as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } else if (currentMetric === 'pain') {
    rawPoints = data.checks
      .filter((c) => c.pain !== null && c.pain !== undefined)
      .map((c) => ({ date: c.date, value: c.pain as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Filter by period
  const now = new Date();
  if (currentPeriod === '7d') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutStr = cutoff.toISOString().slice(0, 10);
    rawPoints = rawPoints.filter((p) => p.date >= cutStr);
  } else if (currentPeriod === '30d') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutStr = cutoff.toISOString().slice(0, 10);
    rawPoints = rawPoints.filter((p) => p.date >= cutStr);
  } else if (currentPeriod === '90d') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    const cutStr = cutoff.toISOString().slice(0, 10);
    rawPoints = rawPoints.filter((p) => p.date >= cutStr);
  }

  const statSummaryEl = document.getElementById('dynamicsSummary');
  if (!rawPoints.length) {
    ctx.fillStyle = '#9b8f8d';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Добавь записи, чтобы увидеть график динамики', width / 2, height / 2);
    if (statSummaryEl) statSummaryEl.textContent = 'Нет данных за выбранный период';
    return;
  }

  const values = rawPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const diff = values[values.length - 1] - values[0];

  if (statSummaryEl) {
    const unit = currentMetric === 'weight' ? 'кг' : currentMetric === 'sleep' ? 'ч' : '/10';
    const diffSign = diff > 0 ? '+' : '';
    statSummaryEl.textContent = `Мин: ${minVal.toFixed(1)} ${unit} · Макс: ${maxVal.toFixed(1)} ${unit} · Изменение: ${diffSign}${diff.toFixed(1)} ${unit}`;
  }

  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yMin = Math.floor(minVal - 0.5);
  const yMax = Math.ceil(maxVal + 0.5) === yMin ? yMin + 1 : Math.ceil(maxVal + 0.5);

  const getX = (i: number) => padLeft + (i / Math.max(1, rawPoints.length - 1)) * plotW;
  const getY = (v: number) => padTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Grid lines
  ctx.strokeStyle = '#ebe2e1';
  ctx.lineWidth = 1;
  ctx.beginPath();

  // Horizontal lines (min, mid, max)
  const steps = 3;
  for (let s = 0; s <= steps; s++) {
    const val = yMin + ((yMax - yMin) / steps) * s;
    const y = getY(val);
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);

    ctx.fillStyle = '#9b8f8d';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(1), padLeft - 6, y + 3);
  }
  ctx.stroke();

  // Draw smooth gradient under curve
  const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
  grad.addColorStop(0, 'rgba(189, 135, 149, 0.28)');
  grad.addColorStop(1, 'rgba(189, 135, 149, 0.0)');

  ctx.beginPath();
  rawPoints.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.value);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineTo(getX(rawPoints.length - 1), getY(yMin));
  ctx.lineTo(getX(0), getY(yMin));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.strokeStyle = '#bd8795';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rawPoints.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw Dots and Date Labels
  rawPoints.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.value);

    ctx.fillStyle = '#bd8795';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Start & End date labels
  ctx.fillStyle = '#7d7270';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatDateShort(rawPoints[0].date), padLeft, height - 10);
  if (rawPoints.length > 1) {
    ctx.textAlign = 'right';
    ctx.fillText(formatDateShort(rawPoints[rawPoints.length - 1].date), width - padRight, height - 10);
  }
}
