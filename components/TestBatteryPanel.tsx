'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  SlidersHorizontal,
  FileCheck2,
  Wrench,
} from 'lucide-react';
import {
  TestBatterySummary,
  AdditionalRequirement,
  DeviceSpec,
} from '@/lib/homologation-engine';

interface TestBatteryPanelProps {
  device: DeviceSpec;
  isRunning: boolean;
  currentStepIndex: number;
  summary: TestBatterySummary | null;
  completedReqIds: string[];
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
];

export function TestBatteryPanel({
  device,
  isRunning,
  currentStepIndex,
  summary,
  completedReqIds,
  onRunBattery,
  onOpenHardwareModal,
  onResolveRequirement,
  onOpenReportModal,
}: TestBatteryPanelProps) {
  if (!isRunning && !summary) {
    return null;
  }

  const remainingRequirements = summary
    ? summary.additionalRequirements.filter((r) => !completedReqIds.includes(r.id))
    : [];

  const blockingCount = remainingRequirements.filter(
    (r) => r.priority === 'bloqueante'
  ).length;
  const mandatoryCount = remainingRequirements.filter(
    (r) => r.priority === 'obrigatorio'
  ).length;
  const complementaryCount = remainingRequirements.filter(
    (r) => r.priority === 'complementar'
  ).length;

  return (
    <div
      data-testid="test-battery-panel"
      className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs"
    >
      {/* Header da Bateria de Testes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
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

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRunBattery}
            disabled={isRunning}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Testando...' : 'Repetir TESTE'}</span>
          </button>
          {summary && (
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Ver Laudo Final</span>
            </button>
          )}
        </div>
      </div>

      {/* Estado de Execução Passo a Passo */}
      {isRunning && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>
              Inspecionando etapa {Math.min(currentStepIndex + 1, 6)} de 6:{' '}
              {STEP_TITLES[Math.min(currentStepIndex, 5)]}
            </span>
            <span className="font-mono tabular-nums">
              {Math.round(((currentStepIndex + 1) / 6) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-150"
              style={{width: `${Math.round(((currentStepIndex + 1) / 6) * 100)}%`}}
            />
          </div>
        </div>
      )}

      {/* Resultados das 6 Etapas da Bateria de Testes */}
      {summary && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              1. Resultado das 6 Etapas de Verificação Técnica Automatizada
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.stages.map((stage) => (
                <div
                  key={stage.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-500 tabular-nums">
                        Etapa {stage.stepNumber}
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

          {/* Seção Crítica Solicitada: "caso valide que precise de algo a mais, me informe" */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Diagnóstico de Pendências: O que mais é necessário para a devida homologação?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Abaixo estão listados todos os ajustes técnicos, atualizações de firmware ou validações físicas de bancada que ainda precisam ser realizados para a aprovação 100% sem ressalvas:
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
        </div>
      )}
    </div>
  );
}
