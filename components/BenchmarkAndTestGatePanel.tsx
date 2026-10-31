'use client';

import React from 'react';
import {
  Cpu,
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  DeviceSpec,
  AVAILABLE_TEST_STAGES,
} from '@/lib/homologation-engine';
import {LiveProbeResult} from '@/lib/device-probe';

interface BenchmarkAndTestGatePanelProps {
  liveProbe: LiveProbeResult | null;
  isBenchmarking: boolean;
  benchmarkProgressPct: number;
  benchmarkStepLabel: string;
  activeDevice: DeviceSpec | null;
  selectedStageIds: string[];
  isRunningTests: boolean;
  onRunBenchmark: () => void;
  onUpdateAutoFilledDevice: (patch: Partial<DeviceSpec>) => void;
  onToggleStageId: (stageId: string) => void;
  onSelectAllStages: () => void;
  onExecuteSelectedTests: () => void;
  onOpenPhysicalHardwareModal: () => void;
}

export function BenchmarkAndTestGatePanel({
  liveProbe,
  isBenchmarking,
  benchmarkProgressPct,
  benchmarkStepLabel,
  activeDevice,
  selectedStageIds,
  isRunningTests,
  onRunBenchmark,
  onUpdateAutoFilledDevice,
  onToggleStageId,
  onSelectAllStages,
  onExecuteSelectedTests,
  onOpenPhysicalHardwareModal,
}: BenchmarkAndTestGatePanelProps) {
  const isUnlocked = Boolean(liveProbe && activeDevice);

  return (
    <div className="space-y-6">
      {/* ETAPA 1: LEVANTAMENTO AUTOMÁTICO & BENCHMARK DE CARACTERÍSTICAS */}
      <div
        data-testid="step1-benchmark-card"
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-800">ETAPA 01</span>
              <span aria-hidden="true">·</span>
              <span>Levantamento Automático de Hardware, Sistema e Criptografia</span>
              {liveProbe && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-semibold">
                    Características Preenchidas às {liveProbe.timestamp}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {liveProbe
                ? 'Ficha Técnica e Benchmark Levantados Automaticamente do Aparelho'
                : '1. Levantar Informações e Preencher Características do Celular (Benchmark)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {liveProbe
                ? 'Todos os parâmetros abaixo foram extraídos e medidos diretamente no dispositivo. Você pode refinar o nome comercial se desejar antes de rodar os testes.'
                : 'Inicie o benchmark para varrer o processador, memória RAM, GPU, tela, enclave criptográfico e preencher automaticamente a ficha do aparelho.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="btn-iniciar-benchmark"
              onClick={onRunBenchmark}
              disabled={isBenchmarking}
              className={`px-5 py-3 min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                liveProbe
                  ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
              }`}
            >
              {liveProbe ? (
                <RefreshCw className={`w-4 h-4 ${isBenchmarking ? 'animate-spin' : ''}`} />
              ) : (
                <Cpu className="w-4 h-4" />
              )}
              <span>
                {isBenchmarking
                  ? 'Levantando Características...'
                  : liveProbe
                    ? 'Refazer Benchmark do Aparelho'
                    : '1. Iniciar Benchmark e Levantar Características'}
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso do Benchmark */}
        {isBenchmarking && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>{benchmarkStepLabel}</span>
              <span className="font-mono tabular-nums">{benchmarkProgressPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-150"
                style={{width: `${benchmarkProgressPct}%`}}
              />
            </div>
          </div>
        )}

        {/* Resultados do Benchmark + Campos Auto-Preenchidos */}
        {!liveProbe && !isBenchmarking ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              Nenhuma característica capturada ainda.
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Clique em <strong>1. Iniciar Benchmark e Levantar Características</strong> acima. O sistema fará a leitura completa do hardware e sistema do celular e desbloqueará a Etapa 02 (Testes de Homologação).
            </p>
          </div>
        ) : null}

        {liveProbe && activeDevice && (
          <div className="space-y-6">
            {/* Placar de Benchmark Sintético (CPU / Memória / Criptografia / Display) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Benchmark CPU (Single / Multi)</p>
                <p
                  data-testid="benchmark-cpu-score"
                  className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5"
                >
                  {liveProbe.cpuSingleCoreScore}{' '}
                  <span className="text-xs font-normal text-slate-400">/</span>{' '}
                  {liveProbe.cpuMultiCoreScore}
                </p>
                <p className="text-[11px] text-slate-500">
                  {liveProbe.cpuCores} núcleos · {liveProbe.systemArchitecture}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Largura de Banda RAM</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {(liveProbe.memoryBandwidthMbPerSec / 1000).toFixed(1)} GB/s
                </p>
                <p className="text-[11px] text-slate-500">
                  ~{liveProbe.estimatedRamGb} GB RAM · Flash{' '}
                  {activeDevice.storageGb} GB
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Throughput Criptográfico</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {liveProbe.cryptoSha256OpsPerSec} op/s
                </p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  AES-256: {liveProbe.cryptoAesGcmMs}ms · ECDSA: {liveProbe.ecdsaKeygenLatencyMs}ms
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Display & Matriz Touch</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {liveProbe.displayRefreshHz} Hz
                </p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {liveProbe.screenResolution} ({liveProbe.pixelRatio}x) · {liveProbe.touchPoints} pts
                </p>
              </div>
            </div>

            {/* Grade de Características Auto-Preenchidas no Aparelho */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  Características Preenchidas Automaticamente (Editáveis para Identificação de Lote)
                </h3>
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Auto-preenchido via Benchmark
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label
                    htmlFor="auto-manufacturer"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Fabricante Detectado
                  </label>
                  <input
                    id="auto-manufacturer"
                    type="text"
                    value={activeDevice.manufacturer}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({manufacturer: e.target.value})
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-model"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Modelo / Identificação do Aparelho
                  </label>
                  <input
                    id="auto-model"
                    type="text"
                    value={activeDevice.model}
                    onChange={(e) => onUpdateAutoFilledDevice({model: e.target.value})}
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-os"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Sistema Operacional Capturado
                  </label>
                  <input
                    id="auto-os"
                    type="text"
                    value={activeDevice.osVersion}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({osVersion: e.target.value})
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-soc"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    GPU / SoC Renderizador Hardware
                  </label>
                  <input
                    id="auto-soc"
                    type="text"
                    value={activeDevice.socChipset}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({socChipset: e.target.value})
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-ram"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Memória RAM Detectada (GB)
                  </label>
                  <input
                    id="auto-ram"
                    type="number"
                    value={activeDevice.ramGb}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({ramGb: Number(e.target.value) || 4})
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-keystore"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Enclave de Segurança Detectado
                  </label>
                  <select
                    id="auto-keystore"
                    value={activeDevice.hardwareKeystore}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({
                        hardwareKeystore: e.target.value as DeviceSpec['hardwareKeystore'],
                      })
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="StrongBox / Secure Enclave">
                      StrongBox / Secure Enclave
                    </option>
                    <option value="TEE Padrão">TEE Padrão (TrustZone)</option>
                    <option value="Software-only">Software-only</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="auto-patch"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Data do Patch de Segurança (SMR)
                  </label>
                  <input
                    id="auto-patch"
                    type="date"
                    value={activeDevice.securityPatchDate}
                    onChange={(e) =>
                      onUpdateAutoFilledDevice({securityPatchDate: e.target.value})
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auto-eol"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Fim de Suporte Previsto (EoL)
                  </label>
                  <input
                    id="auto-eol"
                    type="date"
                    value={activeDevice.eolDate}
                    onChange={(e) => onUpdateAutoFilledDevice({eolDate: e.target.value})}
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ETAPA 2: LIBERAÇÃO DOS TESTES DE HOMOLOGAÇÃO (BLOQUEADA ATÉ CONCLUIR O BENCHMARK) */}
      <div
        data-testid="step2-tests-gate-card"
        className={`border rounded-2xl p-5 sm:p-6 transition-colors ${
          isUnlocked
            ? 'bg-white border-slate-300 shadow-xs'
            : 'bg-slate-100/80 border-slate-200 opacity-85'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-slate-800">ETAPA 02</span>
              <span aria-hidden="true">·</span>
              {isUnlocked ? (
                <span
                  data-testid="tests-gate-status"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Testes Liberados após Benchmark
                </span>
              ) : (
                <span
                  data-testid="tests-gate-status"
                  className="inline-flex items-center gap-1 font-semibold text-slate-600"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Aguardando Levantamento da Etapa 01
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              2. Seleção e Execução dos Testes de Homologação Corporativa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {isUnlocked
                ? 'Selecione abaixo quais baterias de teste você deseja executar sobre as características levantadas do aparelho e clique no botão TESTE.'
                : 'Os testes de homologação estão bloqueados. Execute primeiro o Benchmark na Etapa 01 para levantar as características do celular.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenPhysicalHardwareModal}
              disabled={!isUnlocked}
              className={`px-3.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl border flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                isUnlocked
                  ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Teste Físico de Tela</span>
            </button>

            <button
              type="button"
              data-testid="btn-executar-teste"
              onClick={onExecuteSelectedTests}
              disabled={!isUnlocked || isRunningTests || selectedStageIds.length === 0}
              className={`px-5 py-3 min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                isUnlocked && selectedStageIds.length > 0
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isUnlocked ? (
                <Play className="w-4 h-4 fill-current" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {isRunningTests
                  ? 'Executando Testes Selecionados...'
                  : `TESTE — Executar ${selectedStageIds.length} Teste(s) Selecionado(s)`}
              </span>
            </button>
          </div>
        </div>

        {/* Grade de Seleção dos Testes que o Usuário Quer Realizar */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Marque os testes que deseja realizar neste aparelho ({selectedStageIds.length} de{' '}
              {AVAILABLE_TEST_STAGES.length} selecionados):
            </span>
            {isUnlocked && (
              <button
                type="button"
                onClick={onSelectAllStages}
                className="font-semibold text-slate-700 underline hover:text-slate-900"
              >
                Selecionar todos os {AVAILABLE_TEST_STAGES.length} testes
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_TEST_STAGES.map((stage) => {
              const checked = selectedStageIds.includes(stage.id);
              return (
                <label
                  key={stage.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                    !isUnlocked
                      ? 'bg-slate-100/60 border-slate-200 cursor-not-allowed'
                      : checked
                        ? 'bg-slate-50 border-slate-900 cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!isUnlocked}
                    checked={checked}
                    onChange={() => onToggleStageId(stage.id)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
                  />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-900">
                      {stage.stepNumber}. {stage.title}
                    </p>
                    <p className="text-slate-600 leading-relaxed">{stage.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
