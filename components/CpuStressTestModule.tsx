'use client';

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  Play,
  Square,
  Zap,
  Gauge,
  Flame,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  CpuStressSample,
  CpuThermalThrottlingReport,
  ThermalProfileSimulation,
  executeFloatingPointStressSlice,
  buildStressSampleForSecond,
  analyzeThermalThrottlingSeries,
  DEFAULT_THROTTLING_THRESHOLD_RATIO,
} from '@/lib/cpu-stress-engine';

interface CpuStressTestModuleProps {
  cpuCores?: number;
  onCompleteReport?: (summaryLine: string, report: CpuThermalThrottlingReport) => void;
}

export function CpuStressTestModule({
  cpuCores = 8,
  onCompleteReport,
}: CpuStressTestModuleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [samples, setSamples] = useState<CpuStressSample[]>([]);
  const [simulationProfile, setSimulationProfile] =
    useState<ThermalProfileSimulation>('hardware_live');
  const [liveFps, setLiveFps] = useState<number>(60);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameCounterRef = useRef<number>(0);
  const lastFpsWindowRef = useRef<number>(0);
  const baselineMflopsRef = useRef<number>(0);
  const samplesAccumulatorRef = useRef<CpuStressSample[]>([]);

  // Medidor de FPS em tempo real via requestAnimationFrame durante a execução
  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    frameCounterRef.current = 0;
    lastFpsWindowRef.current = performance.now();

    const trackFrame = (now: number) => {
      frameCounterRef.current += 1;
      const delta = now - lastFpsWindowRef.current;
      if (delta >= 500) {
        const computedFps = Math.min(
          120,
          Math.max(15, Math.round((frameCounterRef.current * 1000) / delta))
        );
        setLiveFps(computedFps);
        frameCounterRef.current = 0;
        lastFpsWindowRef.current = now;
      }
      rafRef.current = requestAnimationFrame(trackFrame);
    };

    rafRef.current = requestAnimationFrame(trackFrame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stopStressTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  };

  const startStressLoop = (intervalMs: number, iterationsPerSlice: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSamples([]);
    setCurrentSecond(0);
    baselineMflopsRef.current = 0;
    samplesAccumulatorRef.current = [];
    // Aquecimento prévio do JIT (TurboFan/Ion) para evitar jitter na amostra s=1
    executeFloatingPointStressSlice(25_000);
    setIsRunning(true);

    let sec = 0;
    timerRef.current = setInterval(() => {
      sec += 1;
      const sliceResult = executeFloatingPointStressSlice(iterationsPerSlice);

      if (sec <= 3) {
        baselineMflopsRef.current =
          baselineMflopsRef.current === 0
            ? sliceResult.mflops
            : Math.round(
                (baselineMflopsRef.current * (sec - 1) + sliceResult.mflops) / sec
              );
      }

      const sample = buildStressSampleForSecond({
        second: sec,
        sliceMflops: sliceResult.mflops,
        baselineMflops: baselineMflopsRef.current || sliceResult.mflops,
        measuredFps: liveFps,
        elapsedMs: sliceResult.elapsedMs,
        simulationProfile,
      });

      const updated = [...samplesAccumulatorRef.current, sample];
      samplesAccumulatorRef.current = updated;
      setSamples(updated);
      setCurrentSecond(sec);

      if (sec >= 30) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRunning(false);
        const finalReport = analyzeThermalThrottlingSeries(
          updated,
          DEFAULT_THROTTLING_THRESHOLD_RATIO
        );
        if (onCompleteReport) {
          onCompleteReport(finalReport.technicalSummary, finalReport);
        }
      }
    }, intervalMs);
  };

  const report = useMemo(
    () => analyzeThermalThrottlingSeries(samples, DEFAULT_THROTTLING_THRESHOLD_RATIO),
    [samples]
  );

  const progressPct = Math.min(100, Math.round((currentSecond / 30) * 100));

  return (
    <div
      data-testid="cpu-stress-test-module"
      className="p-5 sm:p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-5"
    >
      {/* Cabeçalho Técnico do Módulo SYS-04 */}
      <div className="flex flex-col gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-emerald-400 font-bold">
              PILAR 02 · SYSTEM TESTS (SYS-04)
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300 tabular-nums">
              {cpuCores} NÚCLEOS LÓGICOS · LOOP IEEE-754 64-BIT (30 SEGUNDOS)
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white">
            Módulo de Estresse de CPU (30s) & Cálculo de Limiar de Thermal Throttling
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Executa um loop intensivo de ponto flutuante (<code>sin</code>,{' '}
            <code>cos</code>, <code>sqrt</code>, <code>atan2</code>, FMA) durante{' '}
            <strong>30 segundos</strong>, monitorando quedas de{' '}
            <strong>Throughput (MFLOPS)</strong> e <strong>FPS</strong> para identificar o
            segundo exato de cruzamento do limiar de estrangulamento térmico (
            <strong>85% da base fria</strong>).
          </p>
        </div>

        {/* Controles de Perfil e Disparo */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">Curva Térmica:</span>
            <select
              data-testid="select-thermal-profile"
              disabled={isRunning}
              value={simulationProfile}
              onChange={(e) =>
                setSimulationProfile(e.target.value as ThermalProfileSimulation)
              }
              className="px-2.5 py-2 min-h-[38px] rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-slate-500 disabled:opacity-50"
            >
              <option value="hardware_live">Hardware Real (CPU Ao Vivo)</option>
              <option value="throttling_moderate">
                Simular DVFS Throttling Moderado (~T+18s)
              </option>
              <option value="throttling_severe">
                Simular DVFS Throttling Severo (~T+10s)
              </option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {!isRunning ? (
              <>
                <button
                  type="button"
                  data-testid="btn-start-cpu-stress-30s"
                  onClick={() => startStressLoop(1000, 220_000)}
                  className="px-4 py-2 min-h-[38px] text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar Estresse Real (30s)</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-start-cpu-stress-fast"
                  onClick={() => startStressLoop(45, 90_000)}
                  className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ciclo Rápido 30 Amostras (1.5s)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="btn-stop-cpu-stress"
                onClick={stopStressTest}
                className="px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Interromper ({currentSecond}/30s)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Progresso do Loop de 30 Segundos */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 tabular-nums">
            JANELA DE ESTRESSE: <strong className="text-white">{currentSecond}s / 30s</strong> ({progressPct}%)
          </span>
          <span className="text-slate-400 tabular-nums">
            LIMIAR DE THROTTLING CONFIGURADO: <strong className="text-amber-400">85% DO PICO FRIO</strong>
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-150 ${
              report.throttlingDetected ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{width: `${progressPct}%`}}
          />
        </div>
      </div>

      {/* 4 Cartões de Telemetria de Alta Precisão (Máximo 3 dados por cartão) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Throughput Ponto Flutuante (MFLOPS) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Throughput IEEE-754</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <p
            data-testid="stress-metric-sustained-mflops"
            className="text-xl font-bold font-mono text-white tabular-nums"
          >
            {report.sustainedMflops > 0 ? `${report.sustainedMflops} MFLOPS` : '— MFLOPS'}
          </p>
          <p className="text-[11px] font-mono text-slate-400 tabular-nums">
            Base Fria (s1-s3): {report.coldBaselineMflops || '—'} · Pico: {report.peakMflops || '—'}
          </p>
        </div>

        {/* Card 2: Monitoramento de Queda de FPS */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estabilidade de Quadros (FPS)</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <p
            data-testid="stress-metric-fps"
            className="text-xl font-bold font-mono text-white tabular-nums"
          >
            {samples.length > 0 ? `${report.avgFps} FPS méd` : `${liveFps} FPS`}
          </p>
          <p className="text-[11px] font-mono text-slate-400 tabular-nums">
            Mínimo: {report.minFps || '—'} FPS · Queda FPS: -{report.fpsDropPercent}%
          </p>
        </div>

        {/* Card 3: Limiar de Thermal Throttling Calculado */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Limiar Thermal Throttling (85%)</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p
            data-testid="stress-metric-threshold"
            className="text-xl font-bold font-mono text-amber-300 tabular-nums"
          >
            {report.throttlingThresholdMflops > 0
              ? `${report.throttlingThresholdMflops} MFLOPS`
              : '— MFLOPS'}
          </p>
          <p
            data-testid="stress-metric-onset"
            className="text-[11px] font-mono text-slate-300 tabular-nums"
          >
            {samples.length === 0
              ? 'Aguardando amostragem 30s'
              : report.throttlingOnsetSecond !== null
                ? `Gatilho DVFS em T+${report.throttlingOnsetSecond}s · Headroom ${report.estimatedThermalHeadroom}`
                : `Sem estrangulamento (30s) · Headroom ${report.estimatedThermalHeadroom}`}
          </p>
        </div>

        {/* Card 4: Retenção Sustentada & Veredito Térmico */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Retenção Sustentada (30s)</span>
            {report.passedHomologation ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p
            data-testid="stress-metric-stability-pct"
            className={`text-xl font-bold font-mono tabular-nums ${
              samples.length === 0
                ? 'text-white'
                : report.passedHomologation
                  ? 'text-emerald-400'
                  : 'text-amber-400'
            }`}
          >
            {samples.length > 0 ? `${report.sustainedStabilityPercent}%` : '—%'}
          </p>
          <p className="text-[11px] font-mono text-slate-400 tabular-nums">
            Queda máx: -{report.throughputDropPercent}% · {report.thermalGrade}
          </p>
        </div>
      </div>

      {/* Gráfico de Barras da Série Temporal de 30 Segundos com Linha de Limiar de 85% */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-mono font-bold text-slate-200">
            CURVA DE RETENÇÃO DE THROUGHPUT (1s A 30s) VS LIMIAR DE THERMAL THROTTLING (85%)
          </span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" />
              Nominal (&ge;85%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
              Throttling Moderado (75-84%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              Throttling Severo (&lt;75%)
            </span>
          </div>
        </div>

        <div className="relative h-36 pt-4 pb-6 px-2 bg-slate-950/90 rounded-lg border border-slate-800/80 flex items-end gap-1">
          {/* Linha horizontal pontilhada representando o limiar de 85% de Thermal Throttling */}
          <div
            className="absolute left-0 right-0 z-10 border-t border-dashed border-amber-400/80 pointer-events-none flex items-center justify-end pr-2"
            style={{bottom: `${Math.round(0.85 * 75) + 20}px`}}
          >
            <span className="text-[10px] font-mono text-amber-300 bg-slate-950/90 px-1.5 py-0.5 rounded-xs border border-amber-500/30 -mt-2.5">
              Limiar 85% ({report.throttlingThresholdMflops || '—'} MFLOPS)
            </span>
          </div>

          {Array.from({length: 30}, (_, idx) => {
            const secNumber = idx + 1;
            const sample = samples.find((s) => s.second === secNumber);
            const heightPct = sample ? Math.min(100, Math.max(12, sample.retentionPct)) : 8;

            let barColor = 'bg-slate-800';
            if (sample) {
              if (sample.retentionPct < 75) {
                barColor = 'bg-rose-500';
              } else if (sample.retentionPct < 85 || sample.throttledInSlice) {
                barColor = 'bg-amber-400';
              } else {
                barColor = 'bg-emerald-400';
              }
            }

            return (
              <div
                key={secNumber}
                className="flex-1 h-full flex flex-col justify-end items-center group relative"
                title={
                  sample
                    ? `T+${secNumber}s: ${sample.mflops} MFLOPS (${sample.retentionPct}%) · ${sample.fps} FPS · ${sample.estimatedTempC}°C`
                    : `T+${secNumber}s: aguardando`
                }
              >
                <div
                  className={`w-full rounded-t-xs transition-all duration-150 ${barColor}`}
                  style={{height: `${heightPct}%`}}
                />
                {secNumber % 5 === 0 || secNumber === 1 ? (
                  <span className="absolute -bottom-5 text-[10px] font-mono text-slate-500 tabular-nums">
                    {secNumber}s
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Laudo Técnico Consolidado da Execução de 30s */}
        {samples.length > 0 && (
          <div
            data-testid="cpu-stress-verdict-banner"
            className={`p-3.5 rounded-xl border font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              report.passedHomologation
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                : 'bg-amber-950/50 border-amber-800/80 text-amber-200'
            }`}
          >
            <span>{report.technicalSummary}</span>
            <span className="font-bold shrink-0">
              {report.passedHomologation
                ? 'HOMOLOGADO (SEM THROTTLING)'
                : `ALERTA DVFS (T+${report.throttlingOnsetSecond ?? 30}s)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
