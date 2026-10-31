'use client';

import React, {useState} from 'react';
import {X, Copy, Check, Download, FileDown, Printer} from 'lucide-react';
import {
  DeviceSpec,
  HomologationReport,
  ChecklistItem,
  TestBatterySummary,
  USAGE_PROFILE_LABELS,
  formatDurationTimer,
  evaluateTestBatteryDiagnostics,
} from '@/lib/homologation-engine';
import {LiveProbeResult} from '@/lib/device-probe';
import {downloadHomologationPdf} from '@/lib/pdf-exporter';

interface HomologationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: DeviceSpec;
  report: HomologationReport;
  checklist: ChecklistItem[];
  liveProbe: LiveProbeResult | null;
  batterySummary?: TestBatterySummary | null;
}

export function HomologationReportModal({
  isOpen,
  onClose,
  device,
  report,
  checklist,
  liveProbe,
  batterySummary,
}: HomologationReportModalProps) {
  const [copied, setCopied] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  if (!isOpen) return null;

  const effectiveSummary =
    batterySummary && Array.isArray(batterySummary.executionLogs)
      ? batterySummary
      : evaluateTestBatteryDiagnostics(device, checklist, report.activeCves);

  const protocolId = `HOM-${device.manufacturer.slice(0, 3).toUpperCase()}-${device.id
    .slice(-4)
    .toUpperCase()}-2026`;

  const generatePlainTextReport = () => {
    const lines = [
      `LAUDO TÉCNICO DE HOMOLOGAÇÃO MOBILE CORPORATIVA — ${protocolId}`,
      `====================================================================`,
      `Equipamento: ${device.manufacturer} ${device.model} (${device.codename})`,
      `Sistema Operacional: ${device.osVersion} | Patch: ${device.securityPatchDate} (${report.patchAgeDays} dias)`,
      `Hardware: ${device.socChipset} | ${device.ramGb} GB RAM | ${device.storageGb} GB Flash`,
      `Keystore: ${device.hardwareKeystore} | MDM: ${device.mdmSupport}`,
      `Modalidade Avaliada: ${USAGE_PROFILE_LABELS[device.usageProfile]}`,
      `Tempo de Execução da Bateria: ${formatDurationTimer(effectiveSummary.totalDurationMs)} (${effectiveSummary.totalDurationMs} ms)`,
      `--------------------------------------------------------------------`,
      `PARECER FINAL: ${report.verdictLabel.toUpperCase()}`,
      `Índice de Conformidade Técnica: ${report.totalScore}/100`,
      `Resumo Executivo: ${report.verdictSummary}`,
      `--------------------------------------------------------------------`,
      `PONTUAÇÃO POR DOMÍNIO:`,
      ...report.domainScores.map(
        (d) =>
          `- ${d.label}: ${d.score}% (${d.passed} conformes, ${d.warnings} ressalvas, ${d.failed} falhas)`
      ),
      `--------------------------------------------------------------------`,
      `LOG DE EXECUÇÃO DOS TESTES (${effectiveSummary.executionLogs.length} EVENTOS):`,
      ...effectiveSummary.executionLogs.map(
        (l) =>
          `[+${String(l.timestampOffsetMs).padStart(4, '0')}ms] [${l.stageCode}] [${l.level}] (${l.durationMs}ms) ${l.subsystem} -> ${l.measuredOutput}`
      ),
      `--------------------------------------------------------------------`,
      `VULNERABILIDADES (CVEs) NÃO MITIGADAS NO FIRMWARE ATUAL (${report.activeCves.length}):`,
      ...(report.activeCves.length === 0
        ? ['- Nenhuma CVE crítica pendente para o nível de patch instalado.']
        : report.activeCves.map(
            (c) => `- ${c.id} [CVSS ${c.cvssScore} - ${c.severity}]: ${c.component} — ${c.summary}`
          )),
      `--------------------------------------------------------------------`,
      `DIRETRIZES OBRIGATÓRIAS DE GOVERNANÇA & MDM:`,
      ...report.recommendedPolicy.map((p, i) => `${i + 1}. ${p}`),
    ];
    return lines.join('\n');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatePlainTextReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadPdf = () => {
    downloadHomologationPdf({
      device,
      summary: effectiveSummary,
      report,
      checklist,
      liveProbe,
    });
    setPdfDownloaded(true);
    setTimeout(() => setPdfDownloaded(false), 2500);
  };

  const handleDownloadJson = () => {
    const payload = {
      protocolId,
      generatedAt: new Date().toISOString(),
      device,
      verdict: report.verdict,
      verdictLabel: report.verdictLabel,
      totalScore: report.totalScore,
      totalDurationMs: effectiveSummary.totalDurationMs,
      executionLogs: effectiveSummary.executionLogs,
      domainScores: report.domainScores,
      activeCves: report.activeCves,
      recommendedPolicy: report.recommendedPolicy,
      liveHardwareTelemetry: liveProbe,
      checklist,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laudo-homologacao-${device.manufacturer.toLowerCase()}-${device.model
      .toLowerCase()
      .replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              Protocolo {protocolId} · Tempo da Bateria:{' '}
              {formatDurationTimer(effectiveSummary.totalDurationMs)} (
              {effectiveSummary.totalDurationMs} ms)
            </p>
            <h2 id="report-modal-title" className="text-xl font-bold text-slate-900 mt-1">
              Laudo Técnico e Log de Homologação de Dispositivo Móvel
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar laudo técnico"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 py-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Executive Verdict Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                Parecer Oficial · {USAGE_PROFILE_LABELS[device.usageProfile]}
              </p>
              <p
                className={`text-base font-bold ${
                  report.verdict === 'APROVADO_PARQUE'
                    ? 'text-emerald-700'
                    : report.verdict === 'APROVADO_COM_RESTRICOES'
                      ? 'text-amber-700'
                      : 'text-red-700'
                }`}
              >
                {report.verdictLabel}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">{report.verdictSummary}</p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs text-slate-500">Score Técnico</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {report.totalScore}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </p>
            </div>
          </div>

          {/* Especificações Auditadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-200 text-xs">
            <div>
              <p className="text-slate-500">Fabricante / Modelo</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {device.manufacturer} {device.model}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Sistema & Patch</p>
              <p className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                {device.osVersion} · {device.securityPatchDate}
              </p>
            </div>
            <div>
              <p className="text-slate-500">SoC & Memória</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {device.socChipset} ({device.ramGb}GB/{device.storageGb}GB)
              </p>
            </div>
            <div>
              <p className="text-slate-500">Tempo Gasto na Bateria</p>
              <p className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatDurationTimer(effectiveSummary.totalDurationMs)} (
                {effectiveSummary.totalDurationMs} ms)
              </p>
            </div>
          </div>

          {/* Tabela de Domínios */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Desempenho por Domínio de Auditoria
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Domínio de Controle</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Conformes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ressalvas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Falhas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Índice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.domainScores.map((d) => (
                    <tr key={d.domain}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{d.label}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        {d.passed}/{d.total}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                        {d.warnings}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                        {d.failed}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {d.score}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diretrizes e Políticas Recomendadas */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Condicionantes e Políticas de Segurança Recomendadas (MDM / Zero Trust)
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {report.recommendedPolicy.map((policy, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono font-semibold text-slate-500 tabular-nums">
                    0{idx + 1}.
                  </span>
                  <span>{policy}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="btn-export-pdf-modal"
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              {pdfDownloaded ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {pdfDownloaded ? 'PDF Baixado com Sucesso!' : 'Exportar Laudo e Log em PDF'}
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Laudo Copiado!' : 'Copiar Texto'}
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
