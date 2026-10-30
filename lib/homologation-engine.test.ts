import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_DEVICES,
  INITIAL_CHECKLIST_TEMPLATE,
  calculatePatchAgeDays,
  calculateEolMonthsRemaining,
  deriveChecklistFromDeviceSpec,
  matchDeviceCves,
  evaluateHomologation,
  validateCustomDeviceInput,
  evaluateTestBatteryDiagnostics,
} from './homologation-engine';

const REF_DATE = new Date('2026-10-30T12:00:00Z');

test('calculatePatchAgeDays computes exact day delta from reference date', () => {
  const days = calculatePatchAgeDays('2026-10-01', REF_DATE);
  assert.equal(days, 29);
});

test('calculateEolMonthsRemaining returns positive months for supported devices and negative for EoL', () => {
  const s24Months = calculateEolMonthsRemaining('2031-01-31', REF_DATE);
  assert.ok(s24Months >= 50);

  const expiredMonths = calculateEolMonthsRemaining('2026-05-01', REF_DATE);
  assert.ok(expiredMonths < 0);
});

test('Enterprise flagship (Galaxy S24 Enterprise) passes homologation with zero critical failures', () => {
  const s24 = REFERENCE_DEVICES[0];
  const checklist = deriveChecklistFromDeviceSpec(s24, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const cves = matchDeviceCves(s24);
  const report = evaluateHomologation(s24, checklist, cves, REF_DATE);

  assert.equal(cves.length, 0);
  assert.equal(report.criticalFailures.length, 0);
  assert.equal(report.verdict, 'APROVADO_PARQUE');
  assert.ok(report.totalScore >= 90);
});

test('Mid-range device with older patch (Moto G84) receives APROVADO_COM_RESTRICOES and matches unpatched CVEs', () => {
  const moto = REFERENCE_DEVICES[2];
  const checklist = deriveChecklistFromDeviceSpec(moto, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const cves = matchDeviceCves(moto);
  const report = evaluateHomologation(moto, checklist, cves, REF_DATE);

  assert.ok(cves.length >= 2);
  assert.equal(report.verdict, 'APROVADO_COM_RESTRICOES');
  assert.ok(report.totalScore < 85);
});

test('Unverified device with unlocked bootloader and expired EoL is rejected (REPROVADO_RISCO_CRITICO)', () => {
  const redmi = REFERENCE_DEVICES[3];
  const checklist = deriveChecklistFromDeviceSpec(redmi, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const cves = matchDeviceCves(redmi);
  const report = evaluateHomologation(redmi, checklist, cves, REF_DATE);

  assert.equal(report.verdict, 'REPROVADO_RISCO_CRITICO');
  assert.ok(report.criticalFailures.length >= 2);
  assert.ok(report.exploitedCvesCount >= 1);
});

test('validateCustomDeviceInput rejects empty fields and accepts valid enterprise device specs', () => {
  const invalidResult = validateCustomDeviceInput({
    manufacturer: '',
    model: 'X',
    ramGb: 0,
  });
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.manufacturer);
  assert.ok(invalidResult.errors.model);
  assert.ok(invalidResult.errors.ramGb);

  const validResult = validateCustomDeviceInput({
    manufacturer: 'Samsung',
    model: 'Galaxy A55 5G Enterprise',
    osVersion: 'Android 15',
    socChipset: 'Exynos 1480',
    securityPatchDate: '2026-09-15',
    eolDate: '2029-03-30',
    ramGb: 8,
    storageGb: 256,
  });
  assert.equal(validResult.valid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);
});

test('evaluateTestBatteryDiagnostics executes 6 stages and reports exact missing/additional requirements', () => {
  const s24 = REFERENCE_DEVICES[0];
  const s24Checklist = deriveChecklistFromDeviceSpec(s24, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const s24Battery = evaluateTestBatteryDiagnostics(
    s24,
    s24Checklist,
    [],
    {physicalTouchVerified: true},
    REF_DATE
  );

  assert.equal(s24Battery.stages.length, 6);
  assert.equal(s24Battery.allAutomatedPassed, true);
  assert.equal(s24Battery.readyForFinalLaudo, true);

  const redmi = REFERENCE_DEVICES[3];
  const redmiChecklist = deriveChecklistFromDeviceSpec(redmi, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const redmiCves = matchDeviceCves(redmi);
  const redmiBattery = evaluateTestBatteryDiagnostics(
    redmi,
    redmiChecklist,
    redmiCves,
    {},
    REF_DATE
  );

  assert.equal(redmiBattery.allAutomatedPassed, false);
  assert.equal(redmiBattery.readyForFinalLaudo, false);
  assert.ok(
    redmiBattery.additionalRequirements.some((r) => r.id === 'req-lock-bootloader')
  );
  assert.ok(
    redmiBattery.additionalRequirements.some((r) => r.id === 'req-ota-update')
  );
});

