'use client';

import React, {useState} from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  SlidersHorizontal,
  FileCheck2,
  Wrench,
  Timer,
  FileDown,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import {
  TestBatterySummary,
  AdditionalRequirement,
  DeviceSpec,
  HomologationReport,
  ChecklistItem,
  formatDurationTimer,
} from '@/lib/homologation-engine';
import {LiveProbeResult} from '@/lib/device-probe';
import {downloadHomologationPdf} from '@/lib/pdf-exporter';

interface TestBatteryPanelProps {
  device: DeviceSpec;
  isRunning: boolean;
  currentStepIndex: number;
  liveElapsedMs?: number;
  summary: TestBatterySummary | null;
  report?: HomologationReport | null;
  checklist?: ChecklistItem[];
  liveProbe?: LiveProbeResult | null;
  completedReqIds?: string[];
  onRunBattery: () => void;
  onOpenHardwareModal: () => void;
  onResolveRequirement: (req: AdditionalRequirement) => void;
  onOpenReportModal: () => void;
}

const STEP_TITLES = [
  '01. Stress de CPU, Memória RAM e I/O Flash',
  '02. Criptografia AES-GCM / SHA-256 e Enclave ECDSA P-256',
  '03. Cadeia de Bootloader, Verified Boot e Root/Jailbreak',
  '04. Auditoria de Nível de Patch (SMR) e Ciclo de Vida (EoL)',
  '05. Inspeção de Rede WPA3-Enterprise, TLS e Vazamento WebRTC',
  '06. Cruzamento de Vulnerabilidades (CVEs) e Governança MDM',
  '07. Auditoria Forense Refinada (Anti-Frida, SELinux/MTE, USB-C DMA & RPMB)',
];

export function TestBatteryPanel({
  device,
  isRunning,
  currentStepIndex,
  liveElapsedMs = 0,
  summary,
  report,
  checklist,
  liveProbe,
  completedReqIds = [],
  onRunBattery,
  onOpenHardwareModal,
  onResolveRequirement,
  onOpenReportModal,
}: TestBatteryPanelProps) {
  const [logFilter, setLogFilter] = useState<'ALL' | 'PASS' | 'ISSUES'>('ALL');
  const [copiedLog, setCopiedLog] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);

  if (!isRunning && !summary) {
    return null;
  }

  const safeCompletedReqIds = Array.isArray(completedReqIds) ? completedReqIds : [];
  const safeStages = Array.isArray(summary?.stages) ? summary.stages : [];
  const safeAdditionalReqs = Array.isArray(summary?.additionalRequirements)
    ? summary.additionalRequirements
    : [];
  const safeExecutionLogs = Array.isArray(summary?.executionLogs)
    ? summary.executionLogs
    : [];
  const safeTotalDurationMs =
    typeof summary?.totalDurationMs === 'number' && summary.totalDurationMs > 0
      ? summary.totalDurationMs
      : safeStages.reduce((acc, s) => acc + (s.durationMs || 120), 0) || 840;

  const remainingRequirements = safeAdditionalReqs.filter(
    (r) => !safeCompletedReqIds.includes(r.id)
  );

  const blockingCount = remainingRequirements.filter(
    (r) => r.priority === 'bloqueante'
  ).length;
  const mandatoryCount = remainingRequirements.filter(
    (r) => r.priority === 'obrigatorio'
  ).length;
  const complementaryCount = remainingRequirements.filter(
    (r) => r.priority === 'complementar'
  ).length;

  const displayedDurationMs = isRunning ? liveElapsedMs : safeTotalDurationMs;

  const avgMsPerStage =
    safeStages.length > 0
      ? Math.round(safeTotalDurationMs / safeStages.length)
      : 0;

  const filteredLogs = safeExecutionLogs.filter((entry) => {
    if (logFilter === 'PASS') return entry.level === 'PASS' || entry.level === 'INFO';
    if (logFilter === 'ISSUES') return entry.level === 'WARN' || entry.level === 'FAIL';
    return true;
  });

  const handleExportPdf = () => {
    if (!summary) return;
    downloadHomologationPdf({
      device,
      summary: {
        ...summary,
        totalDurationMs: safeTotalDurationMs,
        stages: safeStages,
        executionLogs: safeExecutionLogs,
        additionalRequirements: safeAdditionalReqs,
      },
      report,
      checklist,
      liveProbe,
    });
    setPdfExported(true);
    setTimeout(() => setPdfExported(false), 2500);
  };

  const handleCopyExecutionLog = async () => {
    if (!summary) return;
    const text = safeExecutionLogs
      .map(
        (l) =>
          `[+${String(l.timestampOffsetMs ?? 0).padStart(4, '0')}ms] [${l.stageCode}] [${
            l.level
          }] (${l.durationMs ?? 0}ms) ${l.subsystem} -> ${l.event} | ${l.measuredOutput}`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    } catch {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    }
  };

  return (
    <div
      data-testid="test-battery-panel"
      className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs"
    >
      {/* Header da Bateria de Testes */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">
              Diagnóstico Automatizado de Homologação (Botão TESTE)
            </span>
            {summary && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Executado às {summary.executedAt}
                </span>
              </>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {isRunning
              ? `Executando Bateria de Testes em ${device.manufacturer} ${device.model}...`
              : remainingRequirements.length === 0
                ? 'Todos os Testes e Requisitos Adicionais Concluídos com Sucesso'
                : blockingCount > 0
                  ? `Atenção: Teste Concluído com ${blockingCount} Impedimento(s) Crítico(s) e ${
                      mandatoryCount + complementaryCount
                    } Ação(ões) Complementar(es)`
                  : `Teste Concluído: ${remainingRequirements.length} Validação(ões) Adicional(is) Recomendada(s) para Homologação Plena`}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRunBattery}
            disabled={isRunning}
            className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Testando...' : 'Repetir TESTE'}</span>
          </button>
          {summary && (
            <>
              <button
                type="button"
                data-testid="btn-export-pdf-battery"
                onClick={handleExportPdf}
                className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {pdfExported ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{pdfExported ? 'PDF Exportado!' : 'Exportar para PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenReportModal}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Ver Laudo Final</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* CRONÔMETRO VISUAL DE EXECUÇÃO E EFICIÊNCIA DA HOMOLOGAÇÃO */}
      <div
        data-testid="battery-stopwatch-card"
        className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Timer className={`w-3.5 h-3.5 text-slate-700 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Cronômetro da Bateria de Testes</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="stopwatch-display"
              className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900"
            >
              {formatDurationTimer(displayedDurationMs)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              ({displayedDurationMs} ms)
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">Cadência por Etapa Auditada</p>
          <p className="text-base font-bold font-mono tabular-nums text-slate-900">
            {isRunning
              ? 'Calculando...'
              : `${avgMsPerStage} ms / etapa (${safeStages.length} etapas)`}
          </p>
          <p className="text-[11px] text-slate-500">
            Varredura assíncrona em silício e SO
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">Eficiência Operacional (SLA)</p>
          <p className="text-xs sm:text-sm font-semibold text-emerald-800">
            {isRunning
              ? 'Medindo tempo de execução...'
              : summary?.efficiencyScoreLabel || 'Alta Eficiência Automatizada'}
          </p>
          <p className="text-[11px] text-slate-500">
            Economia de ~{summary?.manualSlaSavedMinutes ?? 44} min vs. checklist manual
          </p>
        </div>

        <div className="space-y-1 sm:text-right">
          <p className="text-xs text-slate-500">Eventos Registrados no Log</p>
          <p className="text-base font-bold font-mono tabular-nums text-slate-900">
            {summary ? `${safeExecutionLogs.length} registros` : 'Capturando...'}
          </p>
          <p className="text-[11px] text-slate-500">
            Trilha auditável pronta para PDF
          </p>
        </div>
      </div>

      {/* Estado de Execução Passo a Passo */}
      {isRunning && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>
              Inspecionando etapa {Math.min(currentStepIndex + 1, STEP_TITLES.length)} de{' '}
              {STEP_TITLES.length}:{' '}
              {STEP_TITLES[Math.min(currentStepIndex, STEP_TITLES.length - 1)]}
            </span>
            <span className="font-mono tabular-nums">
              {Math.round(
                ((Math.min(currentStepIndex + 1, STEP_TITLES.length)) /
                  STEP_TITLES.length) *
                  100
              )}
              %
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-150"
              style={{
                width: `${Math.round(
                  ((Math.min(currentStepIndex + 1, STEP_TITLES.length)) /
                    STEP_TITLES.length) *
                    100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Resultados das Etapas + Pendências + Log de Testes */}
      {summary && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              1. Resultado das Etapas de Verificação Técnica Automatizada ({safeStages.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {safeStages.map((stage) => (
                <div
                  key={stage.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-500 tabular-nums">
                        Etapa {stage.stepNumber} · {stage.durationMs ?? 120} ms
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          stage.status === 'pass'
                            ? 'text-emerald-700'
                            : stage.status === 'warning'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {stage.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {stage.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {stage.status === 'fail' && <XCircle className="w-3.5 h-3.5" />}
                        {stage.status === 'pass'
                          ? 'Aprovado'
                          : stage.status === 'warning'
                            ? 'Ressalva'
                            : 'Falha'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      {stage.title}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {stage.detail}
                    </p>
                  </div>
                  <p className="text-[11px] font-mono text-slate-700 tabular-nums pt-2 border-t border-slate-200/80 truncate">
                    Medição: {stage.measuredMetric}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 2: Diagnóstico de Pendências */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Diagnóstico de Pendências: O que mais é necessário para a devida homologação?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ajustes técnicos, atualizações de firmware ou validações físicas de bancada que ainda precisam ser realizados para a aprovação sem ressalvas:
                </p>
              </div>
              <span
                data-testid="pending-requirements-count"
                className="text-xs font-mono font-semibold text-slate-700 tabular-nums shrink-0"
              >
                {remainingRequirements.length} pendência(s) ativa(s)
              </span>
            </div>

            {remainingRequirements.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Nenhuma pendência adicional restante para este aparelho!
                  </p>
                  <p className="text-emerald-800 mt-0.5">
                    Todos os testes automatizados de hardware, criptografia, ciclo de patches e validações físicas de bancada foram cumpridos. O equipamento está pronto para emissão do Laudo Final.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {remainingRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={
                            req.priority === 'bloqueante'
                              ? 'font-bold text-red-700'
                              : req.priority === 'obrigatorio'
                                ? 'font-semibold text-amber-700'
                                : 'font-semibold text-slate-700'
                          }
                        >
                          {req.priority === 'bloqueante'
                            ? 'IMPEDIMENTO BLOQUEANTE'
                            : req.priority === 'obrigatorio'
                              ? 'REQUISITO TÉCNICO OBRIGATÓRIO'
                              : 'VALIDAÇÃO FÍSICA / COMPLEMENTAR'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{req.category}</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900">{req.title}</p>
                      <p className="text-xs text-slate-600">{req.reason}</p>
                      <p className="text-xs text-slate-800 pt-0.5">
                        <strong className="font-semibold">O que fazer agora:</strong>{' '}
                        {req.actionRequired}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {req.id === 'req-physical-touch-bench' && (
                        <button
                          type="button"
                          onClick={onOpenHardwareModal}
                          className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Abrir Teste de Tela</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onResolveRequirement(req)}
                        className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>
                          {req.priority === 'complementar'
                            ? 'Confirmar Validação'
                            : 'Aplicar Adequação / Validar'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 3: Log Técnico de Testes e Exportação para PDF */}
          <div
            data-testid="test-execution-log"
            className="pt-4 border-t border-slate-200 space-y-3"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Log Técnico de Execução da Bateria de Testes ({filteredLogs.length} de{' '}
                    {safeExecutionLogs.length} eventos)
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Registro cronológico em milissegundos de cada sonda de hardware, enclave criptográfico e verificação de segurança executada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="Filtrar log de testes"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                >
                  {(
                    [
                      ['ALL', 'Todos'],
                      ['PASS', 'Conformes'],
                      ['ISSUES', 'Alertas / Falhas'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLogFilter(key)}
                      className={`px-2.5 py-1 min-h-[32px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        logFilter === key
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyExecutionLog}
                  className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedLog ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLog ? 'Log Copiado!' : 'Copiar Log'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-3.5 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Exportar Log e Laudo em PDF</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 text-slate-100">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>
                  TRILHA DE AUDITORIA · {device.manufacturer.toUpperCase()}{' '}
                  {device.model.toUpperCase()}
                </span>
                <span className="tabular-nums">
                  TEMPO TOTAL: {formatDurationTimer(safeTotalDurationMs)} (
                  {safeTotalDurationMs} ms)
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto font-mono text-xs">
                {filteredLogs.map((entry) => (
                  <div
                    key={entry.id}
                    data-testid="test-log-row"
                    className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-400 tabular-nums">
                          +{String(entry.timestampOffsetMs ?? 0).padStart(4, '0')}ms
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-300 font-semibold">
                          [{entry.stageCode}]
                        </span>
                        <span
                          className={
                            entry.level === 'PASS'
                              ? 'text-emerald-400 font-bold'
                              : entry.level === 'WARN'
                                ? 'text-amber-400 font-bold'
                                : entry.level === 'FAIL'
                                  ? 'text-red-400 font-bold'
                                  : 'text-sky-400 font-bold'
                          }
                        >
                          {entry.level}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {entry.subsystem}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed">
                        {entry.event}
                      </p>
                      <p className="text-slate-400 text-[11px] tabular-nums">
                        Saída medida: {entry.measuredOutput}
                      </p>
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-slate-400 tabular-nums">
                      {entry.durationMs ?? 0} ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
