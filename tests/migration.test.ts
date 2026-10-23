import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeBackup, getEmptyAppData } from '../src/core/migration';

test('normalizeBackup should handle empty or null input safely', () => {
  const result = normalizeBackup(null);
  assert.deepEqual(result.checks, []);
  assert.deepEqual(result.workouts, []);
  assert.deepEqual(result.weights, []);
  assert.deepEqual(result.measures, []);
  assert.ok(result.customExercises.length > 0);
});

test('normalizeBackup should correctly migrate v1/v2 backup sample file', () => {
  const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/backup-sample.json');
  const rawContent = fs.readFileSync(fixturePath, 'utf-8');
  const parsed = JSON.parse(rawContent);

  const normalized = normalizeBackup(parsed);

  // Check checks
  assert.equal(normalized.checks.length, 1);
  assert.equal(normalized.checks[0].mood, '😐 Нормальное');
  assert.equal(normalized.checks[0].sleep, 8);
  assert.equal(normalized.checks[0].energy, 6);
  assert.equal(normalized.checks[0].pain, 0);
  assert.equal(normalized.checks[0].plan, 'Дала');
  assert.equal(normalized.checks[0].note, 'Лалал');

  // Check workouts
  assert.equal(normalized.workouts.length, 3);
  assert.ok(normalized.workouts[0].items.includes('Мягкая разминка плеч и шеи'));

  // Check weights (must be sorted by date)
  assert.equal(normalized.weights.length, 2);
  assert.equal(normalized.weights[0].weight, 48.8);
  assert.equal(normalized.weights[1].weight, 47);
  assert.ok(normalized.weights[0].date <= normalized.weights[1].date);
});

test('normalizeBackup should handle legacy flat goals and wins', () => {
  const legacyData = {
    app: 'Моё восстановление',
    version: 2,
    data: {
      checks: [],
      workouts: [],
      weights: [],
      measures: [],
    },
    extras: {
      goals: ['Позавтракать', 'Погулять 15 мин', ''],
      wins: [{ date: '2026-10-22', text: 'Погуляла в парке' }],
    },
  };

  const normalized = normalizeBackup(legacyData);
  assert.equal(normalized.goals.length, 1);
  assert.equal(normalized.goals[0].goals.length, 2);
  assert.equal(normalized.goals[0].goals[0].text, 'Позавтракать');
  assert.equal(normalized.goals[0].goals[0].completed, false);

  assert.equal(normalized.wins.length, 1);
  assert.equal(normalized.wins[0].text, 'Погуляла в парке');
});

test('getInitialSeedData should load the 22-10-2026 backup correctly', async () => {
  const { getInitialSeedData } = await import('../src/core/seed_data');
  const seed = getInitialSeedData();
  assert.equal(seed.checks.length, 1);
  assert.equal(seed.checks[0].date, '2026-10-21');
  assert.equal(seed.workouts.length, 3);
  assert.equal(seed.weights.length, 2);
  assert.equal(seed.weights[1].weight, 47);
});
