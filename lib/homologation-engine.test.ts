import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCE_DEVICES,
  INITIAL_CHECKLIST_TEMPLATE,
  AVAILABLE_TEST_STAGES,
  calculatePatchAgeDays,
  calculateEolMonthsRemaining,
  deriveChecklistFromDeviceSpec,
  matchDeviceCves,
  evaluateHomologation,
  validateCustomDeviceInput,
  evaluateTestBatteryDiagnostics,
  buildCapturedDeviceFromProbe,
  formatDurationTimer,
  HIGH_CONTRAST_STORAGE_KEY,
  getContrastModeTokens,
  getChecklistSeverityBadge,
} from './homologation-engine';
import {generateHomologationPdfBytes} from './pdf-exporter';
import {
  FOUR_PILLARS_META,
  FOUR_PILLARS_ITEMS,
  runRefinedForensicSuite,
} from './four-pillars-framework';
import {
  executeFloatingPointStressSlice,
  buildStressSampleForSecond,
  analyzeThermalThrottlingSeries,
} from './cpu-stress-engine';
import {
  SHARED_PUBLIC_APP_URL,
  resolveMobileAccessUrls,
  generateMobileQrCodeSvg,
  generateStandaloneMobileBuildHtml,
  generateCapacitorConfigJson,
} from './mobile-access-pwa';

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

test('evaluateTestBatteryDiagnostics executes all 7 stages (including deep forensics) or filters by selectedStageIds after benchmark unlock', () => {
  const s24 = REFERENCE_DEVICES[0];
  const s24Checklist = deriveChecklistFromDeviceSpec(s24, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const s24Battery = evaluateTestBatteryDiagnostics(
    s24,
    s24Checklist,
    [],
    {physicalTouchVerified: true, elapsedDurationMs: 920},
    REF_DATE
  );

  assert.equal(AVAILABLE_TEST_STAGES.length, 7);
  assert.equal(s24Battery.stages.length, 7);
  assert.equal(s24Battery.totalDurationMs, 920);
  assert.ok(s24Battery.executionLogs.length >= 9);
  assert.equal(s24Battery.allAutomatedPassed, true);
  assert.equal(s24Battery.readyForFinalLaudo, true);

  // Filter to 3 specific user-selected stages after benchmark
  const subsetBattery = evaluateTestBatteryDiagnostics(
    s24,
    s24Checklist,
    [],
    {
      physicalTouchVerified: true,
      selectedStageIds: ['stage-hw-core', 'stage-crypto-enclave', 'stage-deep-forensics'],
    },
    REF_DATE
  );
  assert.equal(subsetBattery.stages.length, 3);

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

test('buildCapturedDeviceFromProbe creates a clean DeviceSpec dynamically from live benchmark telemetry', () => {
  const captured = buildCapturedDeviceFromProbe(
    {
      detectedPlatform: 'Android 15',
      userAgentSummary: 'Mozilla/5.0 (Linux; Android 15; SM-S928B)',
      cpuCores: 8,
      estimatedRamGb: 12,
      gpuRenderer: 'Adreno (TM) 750',
      screenResolution: '412 × 915',
      storageQuotaGb: 256,
      webAuthnPlatformAvailable: true,
    },
    1
  );

  assert.equal(captured.manufacturer, 'Samsung');
  assert.equal(captured.osFamily, 'Android');
  assert.equal(captured.ramGb, 12);
  assert.equal(captured.hardwareKeystore, 'StrongBox / Secure Enclave');
});

test('formatDurationTimer and generateHomologationPdfBytes format stopwatch and build valid PDF 1.4 document with logs', () => {
  assert.equal(formatDurationTimer(845), '00:00.845');
  assert.equal(formatDurationTimer(65120), '01:05.120');

  const s24 = REFERENCE_DEVICES[0];
  const checklist = deriveChecklistFromDeviceSpec(s24, INITIAL_CHECKLIST_TEMPLATE, REF_DATE);
  const summary = evaluateTestBatteryDiagnostics(
    s24,
    checklist,
    [],
    {elapsedDurationMs: 960},
    REF_DATE
  );
  const report = evaluateHomologation(s24, checklist, [], REF_DATE);

  const pdfBytes = generateHomologationPdfBytes({
    device: s24,
    summary,
    report,
    checklist,
  });

  const pdfString = new TextDecoder().decode(pdfBytes);
  assert.ok(pdfString.startsWith('%PDF-1.4'));
  assert.ok(pdfString.includes('CRONOMETRO DE EXECUCAO'));
  assert.ok(pdfString.includes('LOG TECNICO DE EXECUCAO DOS TESTES'));
  assert.ok(pdfString.includes('00:00.960'));
  assert.ok(pdfString.endsWith('%%EOF'));
});

test('Four Pillars Testing Framework covers all 4 pillars and 32 sub-items (24 core + 8 refined) with OS mechanisms, permissions, and 4 tech stacks', () => {
  assert.equal(FOUR_PILLARS_META.length, 4);
  assert.equal(FOUR_PILLARS_ITEMS.length, 32);

  const hwCount = FOUR_PILLARS_ITEMS.filter((i) => i.pillarId === 'pillar_hardware').length;
  const sysCount = FOUR_PILLARS_ITEMS.filter((i) => i.pillarId === 'pillar_system').length;
  const secCount = FOUR_PILLARS_ITEMS.filter((i) => i.pillarId === 'pillar_infosec').length;
  const hwsCount = FOUR_PILLARS_ITEMS.filter((i) => i.pillarId === 'pillar_hwsec').length;
  const refinedCount = FOUR_PILLARS_ITEMS.filter((i) => i.tier === 'refined').length;

  assert.equal(hwCount, 10);
  assert.equal(sysCount, 7);
  assert.equal(secCount, 8);
  assert.equal(hwsCount, 7);
  assert.equal(refinedCount, 8);

  for (const item of FOUR_PILLARS_ITEMS) {
    assert.ok(item.osMechanismAndroid.length > 20);
    assert.ok(item.osMechanismIos.length > 20);
    assert.ok(item.androidPermissions.length >= 1);
    assert.ok(item.iosPermissions.length >= 1);
    assert.ok(item.codeByStack.kotlin.length > 40);
    assert.ok(item.codeByStack.swift.length > 40);
    assert.ok(item.codeByStack.flutter.length > 40);
    assert.ok(item.codeByStack.react_native.length > 40);
  }

  const suite = runRefinedForensicSuite({
    screenResolution: '1440×900',
    displayRefreshHz: 120,
    cpuCores: 8,
    cryptoSha256OpsPerSec: 11200,
    ecdsaKeyFingerprint: 'ECDSA-P256-OK',
  });
  assert.equal(suite.totalCount, 8);
  assert.equal(suite.passedCount, 8);
  assert.ok(suite.totalDurationMs > 0);
});

test('CPU Stress-Test 30-second floating-point engine calculates MFLOPS throughput, FPS drops, and exact thermal throttling threshold second', () => {
  const slice = executeFloatingPointStressSlice(40_000);
  assert.equal(slice.opsCompleted, 40_000 * 8);
  assert.ok(slice.mflops >= 10);
  assert.ok(!Number.isNaN(slice.checksum));

  // 1. Dispositivo estável por 30s (sem cruzar abaixo de 85% do pico frio)
  const stableSamples = Array.from({length: 30}, (_, idx) =>
    buildStressSampleForSecond({
      second: idx + 1,
      sliceMflops: 1000 - (idx % 3) * 15,
      baselineMflops: 1000,
      measuredFps: 60,
      simulationProfile: 'hardware_live',
    })
  );
  const stableReport = analyzeThermalThrottlingSeries(stableSamples, 0.85);
  assert.equal(stableReport.durationSeconds, 30);
  assert.equal(stableReport.throttlingDetected, false);
  assert.equal(stableReport.throttlingOnsetSecond, null);
  assert.ok(stableReport.sustainedStabilityPercent >= 95);
  assert.equal(stableReport.passedHomologation, true);

  // 2. Dispositivo com Throttling Moderado (cruza limiar de 85% após aquecimento)
  const moderateSamples = Array.from({length: 30}, (_, idx) =>
    buildStressSampleForSecond({
      second: idx + 1,
      sliceMflops: 1000,
      baselineMflops: 1000,
      measuredFps: 60,
      simulationProfile: 'throttling_moderate',
    })
  );
  const moderateReport = analyzeThermalThrottlingSeries(moderateSamples, 0.85);
  assert.equal(moderateReport.durationSeconds, 30);
  assert.equal(moderateReport.throttlingDetected, true);
  assert.ok(
    moderateReport.throttlingOnsetSecond !== null &&
      moderateReport.throttlingOnsetSecond >= 18 &&
      moderateReport.throttlingOnsetSecond <= 25
  );
  assert.equal(moderateReport.passedHomologation, false);

  // 3. Dispositivo com Throttling Severo (cruza limiar de 85% cedo e cai abaixo de 75%)
  const severeSamples = Array.from({length: 30}, (_, idx) =>
    buildStressSampleForSecond({
      second: idx + 1,
      sliceMflops: 1000,
      baselineMflops: 1000,
      measuredFps: 60,
      simulationProfile: 'throttling_severe',
    })
  );
  const severeReport = analyzeThermalThrottlingSeries(severeSamples, 0.85);
  assert.equal(severeReport.throttlingDetected, true);
  assert.ok(
    severeReport.throttlingOnsetSecond !== null &&
      severeReport.throttlingOnsetSecond <= 14
  );
  assert.equal(severeReport.thermalGrade, 'C (Throttling Severo)');
  assert.ok(severeReport.throughputDropPercent >= 30);
});

test('getContrastModeTokens resolves normal and high-contrast CSS variables for high-luminosity field auditing', () => {
  assert.equal(HIGH_CONTRAST_STORAGE_KEY, 'homologit_high_contrast_v1');

  const normalTokens = getContrastModeTokens(false);
  assert.equal(normalTokens.mode, 'normal');
  assert.equal(normalTokens.dataAttribute, 'normal');
  assert.equal(normalTokens.cssVariables['--hc-bg-canvas'], '#f8fafc');
  assert.equal(normalTokens.cssVariables['--hc-text-primary'], '#0f172a');
  assert.equal(normalTokens.cssVariables['--hc-border-width'], '1px');

  const highTokens = getContrastModeTokens(true);
  assert.equal(highTokens.mode, 'high');
  assert.equal(highTokens.dataAttribute, 'high');
  assert.ok(highTokens.contrastRatioLabel.includes('21:1'));
  assert.equal(highTokens.cssVariables['--hc-bg-canvas'], '#ffffff');
  assert.equal(highTokens.cssVariables['--hc-text-primary'], '#000000');
  assert.equal(highTokens.cssVariables['--hc-border'], '#000000');
  assert.equal(highTokens.cssVariables['--hc-border-width'], '2px');
  assert.equal(highTokens.cssVariables['--hc-toggle-bg'], '#000000');
  assert.equal(highTokens.cssVariables['--hc-toggle-fg'], '#ffea00');
});

test('getChecklistSeverityBadge maps critical and high checklist items to Crítico and Alta visual badge metadata', () => {
  const critBadge = getChecklistSeverityBadge('critical');
  assert.equal(critBadge.badgeLabel, 'Crítico');
  assert.equal(critBadge.weightPoints, 15);
  assert.equal(critBadge.isHighPriority, true);

  const highBadge = getChecklistSeverityBadge('high');
  assert.equal(highBadge.badgeLabel, 'Alta');
  assert.equal(highBadge.weightPoints, 8);
  assert.equal(highBadge.isHighPriority, true);

  const medBadge = getChecklistSeverityBadge('medium');
  assert.equal(medBadge.badgeLabel, 'Média');
  assert.equal(medBadge.weightPoints, 4);
  assert.equal(medBadge.isHighPriority, false);
});

test('mobile-access-pwa generates scannable ISO-18004 QR Code SVG and universal mobile standalone compilation', async () => {
  const {defaultUrl, endpoints} = resolveMobileAccessUrls('http://localhost:3000');
  assert.equal(defaultUrl, SHARED_PUBLIC_APP_URL);
  assert.ok(endpoints.length >= 2);
  assert.equal(endpoints[0].recommendedForExternalPhones, true);

  const svg = await generateMobileQrCodeSvg(SHARED_PUBLIC_APP_URL);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('</svg>'));

  const standaloneHtml = generateStandaloneMobileBuildHtml(SHARED_PUBLIC_APP_URL);
  assert.ok(standaloneHtml.startsWith('<!DOCTYPE html>'));
  assert.ok(standaloneHtml.includes('HomologIT Mobile'));
  assert.ok(standaloneHtml.includes('runMobileBenchmark()'));

  const capJson = JSON.parse(generateCapacitorConfigJson(SHARED_PUBLIC_APP_URL));
  assert.equal(capJson.appId, 'br.corp.secops.homologit');
  assert.equal(capJson.server.url, SHARED_PUBLIC_APP_URL);
});




