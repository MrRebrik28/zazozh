import { storage } from '../core/storage';
import { formatDateRu, todayString } from '../utils/date';
import { haptics } from '../utils/haptics';
import { showToast } from './dashboard';

export function setupPassport() {
  // Export JSON
  document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    const jsonStr = storage.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moe-vosstanovlenie-backup-${todayString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    haptics.success();
    showToast('Резервная копия подготовлена 📁');
  });

  // Import JSON
  const fileInput = document.getElementById('importBackupInput') as HTMLInputElement;
  document.getElementById('importBackupBtn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      if (!confirm('Заменить текущие данные записями из файла? Рекомендуется сначала скачать копию текущих данных.')) {
        return;
      }
      const success = await storage.importBackup(text);
      if (success) {
        haptics.success();
        showToast('Данные успешно восстановлены! 🌸');
      } else {
        showToast('Ошибка: не удалось прочитать файл резервной копии');
      }
    } catch (err) {
      console.error(err);
      showToast('Ошибка при чтении файла');
    }
    fileInput.value = '';
  });

  // Clear All
  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    if (confirm('Точно удалить все данные? Это действие необратимо. Сначала скачай резервную копию, если нужно сохранить историю.')) {
      await storage.clearAll();
      haptics.medium();
      showToast('Все записи очищены');
    }
  });

  // Copy Doctor Summary
  document.getElementById('copyReportBtn')?.addEventListener('click', () => {
    const report = generateDoctorReport();
    navigator.clipboard.writeText(report).then(() => {
      haptics.success();
      showToast('Сводка для врача скопирована в буфер обмена 📋');
    }).catch(() => {
      showToast('Не удалось скопировать сводку');
    });
  });
}

export function renderPassport() {
  const data = storage.getData();
  const summaryEl = document.getElementById('passportSummary');
  if (summaryEl) {
    summaryEl.textContent = `Чек-ины: ${data.checks.length} · Тренировки: ${data.workouts.length} · Записи веса: ${data.weights.length} · Замеры: ${data.measures.length} · Победы: ${data.wins.length}`;
  }

  const reportPreviewEl = document.getElementById('reportPreview');
  if (reportPreviewEl) {
    reportPreviewEl.textContent = generateDoctorReport();
  }
}

function generateDoctorReport(): string {
  const data = storage.getData();
  const checks = data.checks.slice(0, 14); // Last 14 checks
  const workouts = data.workouts.slice(0, 14);
  const weights = data.weights.slice(-5);

  const lines: string[] = [];
  lines.push('📋 Сводка самочувствия и активности («Моё восстановление»)');
  lines.push(`Дата отчёта: ${formatDateRu(todayString())}`);
  lines.push('----------------------------------------');

  if (checks.length > 0) {
    const sleeps = checks.map((c) => c.sleep).filter((s): s is number => s !== null && s !== undefined);
    const avgSleep = sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : 'нет данных';

    const pains = checks.map((c) => c.pain).filter((p): p is number => p !== null && p !== undefined);
    const avgPain = pains.length ? (pains.reduce((a, b) => a + b, 0) / pains.length).toFixed(1) : 'нет данных';

    lines.push(`Период записей: ${checks.length} дней`);
    lines.push(`Средняя продолжительность сна: ${avgSleep} ч`);
    lines.push(`Средний уровень боли: ${avgPain}/10`);

    const painAreasAll = checks.flatMap((c) => c.painAreas || []);
    if (painAreasAll.length) {
      lines.push(`Отмеченные зоны дискомфорта: ${Array.from(new Set(painAreasAll)).join(', ')}`);
    }
  } else {
    lines.push('Чек-ины за последнее время отсутствуют.');
  }

  lines.push(`Выполнено комплексов упражнений/ЛФК: ${workouts.length}`);

  if (weights.length > 0) {
    lines.push(`Текущий вес: ${weights[weights.length - 1].weight} кг`);
  }

  return lines.join('\n');
}
