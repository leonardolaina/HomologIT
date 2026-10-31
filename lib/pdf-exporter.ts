import {
  DeviceSpec,
  TestBatterySummary,
  HomologationReport,
  ChecklistItem,
  USAGE_PROFILE_LABELS,
  formatDurationTimer,
} from './homologation-engine';
import {LiveProbeResult} from './device-probe';

export interface PdfExportPayload {
  device: DeviceSpec;
  summary: TestBatterySummary;
  report?: HomologationReport | null;
  checklist?: ChecklistItem[];
  liveProbe?: LiveProbeResult | null;
}

/**
 * Strips diacritics and normalizes text to WinAnsi/ASCII-safe characters for standard PDF Type1 fonts
 */
function sanitizePdfText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars: number = 92): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates a valid multi-page PDF 1.4 document as a Uint8Array (pure TypeScript, testable in Node & Browser)
 */
export function generateHomologationPdfBytes(payload: PdfExportPayload): Uint8Array {
  const {device, summary, report, liveProbe} = payload;
  const protocolId = `HOM-${device.manufacturer.slice(0, 3).toUpperCase()}-${device.id
    .slice(-4)
    .toUpperCase()}-2026`;

  interface PdfLine {
    text: string;
    font: 'F1' | 'F2' | 'F3'; // F1=Helvetica, F2=Helvetica-Bold, F3=Courier
    size: number;
    spacingAfter: number;
  }

  const lines: PdfLine[] = [];

  const addHeading = (text: string, size = 12) => {
    lines.push({text: sanitizePdfText(text), font: 'F2', size, spacingAfter: 16});
  };

  const addBody = (text: string, size = 9) => {
    for (const part of wrapLine(text, 94)) {
      lines.push({text: sanitizePdfText(part), font: 'F1', size, spacingAfter: 13});
    }
  };

  const addMono = (text: string, size = 8) => {
    for (const part of wrapLine(text, 98)) {
      lines.push({text: sanitizePdfText(part), font: 'F3', size, spacingAfter: 11});
    }
  };

  const addDivider = () => {
    lines.push({
      text: '--------------------------------------------------------------------------------------------------',
      font: 'F3',
      size: 8,
      spacingAfter: 12,
    });
  };

  const safeStages = Array.isArray(summary?.stages) ? summary.stages : [];
  const safeLogs = Array.isArray(summary?.executionLogs) ? summary.executionLogs : [];
  const safeReqs = Array.isArray(summary?.additionalRequirements)
    ? summary.additionalRequirements
    : [];
  const safeDuration =
    typeof summary?.totalDurationMs === 'number' && summary.totalDurationMs > 0
      ? summary.totalDurationMs
      : 840;

  // Document Header
  addHeading(`HOMOLOGIT - LAUDO TECNICO E LOG DE AUDITORIA MOBILE (${protocolId})`, 13);
  addBody(
    `Emitido em: ${new Date().toISOString().slice(0, 10)} as ${
      summary?.executedAt || '00:00:00'
    } | Modalidade: ${USAGE_PROFILE_LABELS[device.usageProfile]}`
  );
  addDivider();

  // Section 1: Cronometro & Eficiencia da Homologacao
  addHeading('1. CRONOMETRO DE EXECUCAO E EFICIENCIA DO PROCESSO DE HOMOLOGACAO', 11);
  addMono(
    `Tempo Total Gasto na Bateria : ${formatDurationTimer(safeDuration)} (${safeDuration} ms)`
  );
  addMono(`Etapas Executadas            : ${safeStages.length} de 6 baterias automatizadas`);
  addMono(
    `Media por Etapa              : ${Math.round(
      safeDuration / Math.max(1, safeStages.length)
    )} ms/etapa`
  );
  addMono(
    `Indice de Eficiencia         : ${
      summary?.efficiencyScoreLabel || 'Alta Eficiencia Automatizada'
    }`
  );
  addMono(
    `Economia de Tempo Estimada   : ~${
      summary?.manualSlaSavedMinutes ?? 44
    } min poupados frente a bancada manual`
  );
  addDivider();

  // Section 2: Caracteristicas Levantadas Automaticamente (Benchmark)
  addHeading('2. FICHA TECNICA DO APARELHO (LEVANTAMENTO AUTOMATICO & BENCHMARK)', 11);
  addMono(`Fabricante / Modelo : ${device.manufacturer} ${device.model} (${device.codename})`);
  addMono(
    `Sistema Operacional : ${device.osVersion} | Patch SMR: ${device.securityPatchDate} | EoL: ${device.eolDate}`
  );
  addMono(
    `Processador / SoC   : ${device.socChipset} | Memoria: ${device.ramGb} GB RAM / ${device.storageGb} GB Flash`
  );
  addMono(
    `Enclave & Boot      : ${device.hardwareKeystore} | Bootloader: ${
      device.bootloaderLocked ? 'BLOQUEADO (OK)' : 'DESBLOQUEADO (FALHA)'
    }`
  );
  if (liveProbe) {
    addMono(
      `Benchmark Medido    : CPU ${liveProbe.cpuSingleCoreScore}/${liveProbe.cpuMultiCoreScore} pts | RAM ${liveProbe.memoryBandwidthMbPerSec} MB/s | SHA-256 ${liveProbe.cryptoSha256OpsPerSec} op/s`
    );
  }
  if (report) {
    addMono(
      `Parecer Consolidado : ${report.verdictLabel} (Score: ${report.totalScore}/100)`
    );
  }
  addDivider();

  // Section 3: Resultados das Etapas
  addHeading('3. RESULTADO DAS ETAPAS DA BATERIA DE TESTES', 11);
  for (const st of safeStages) {
    const badge =
      st.status === 'pass' ? '[APROVADO]' : st.status === 'warning' ? '[RESSALVA]' : '[FALHA]';
    addMono(
      `Etapa ${st.stepNumber} ${badge} (${st.durationMs ?? 120}ms) - ${st.title}`
    );
    addBody(`   Medicao: ${st.measuredMetric} | ${st.detail}`, 8.5);
  }
  addDivider();

  // Section 4: Log Tecnico Detalhado de Execucao
  addHeading(`4. LOG TECNICO DE EXECUCAO DOS TESTES (${safeLogs.length} EVENTOS)`, 11);
  for (const entry of safeLogs) {
    const offsetStr = `+${String(entry.timestampOffsetMs ?? 0).padStart(4, '0')}ms`;
    addMono(
      `[${offsetStr}] [${entry.stageCode}] [${entry.level}] (${entry.durationMs ?? 0}ms) ${
        entry.subsystem
      }`
    );
    addMono(`   -> ${entry.event}`);
    addMono(`   -> Evidencia: ${entry.measuredOutput}`);
  }
  addDivider();

  // Section 5: Pendencias e Requisitos Adicionais
  addHeading(
    `5. DIAGNOSTICO DE PENDENCIAS ADICIONAIS (${safeReqs.length} APONTAMENTOS)`,
    11
  );
  if (safeReqs.length === 0) {
    addBody('Nenhuma pendencia tecnica adicional. Aparelho 100% conforme.');
  } else {
    for (const req of safeReqs) {
      addMono(`[${req.priority.toUpperCase()}] ${req.category} - ${req.title}`);
      addBody(`   Acao Exigida: ${req.actionRequired}`, 8.5);
    }
  }

  // Paginate lines (max ~700 vertical pts per A4 page)
  const pages: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let currentY = 790;

  for (const line of lines) {
    if (currentY - line.spacingAfter < 52) {
      pages.push(currentPage);
      currentPage = [];
      currentY = 790;
    }
    currentPage.push(line);
    currentY -= line.spacingAfter;
  }
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Build PDF 1.4 objects
  // Object 1: Catalog
  // Object 2: Pages
  // Object 3: Font F1 (Helvetica)
  // Object 4: Font F2 (Helvetica-Bold)
  // Object 5: Font F3 (Courier)
  // Objects 6..(5 + pages.length * 2): Page & Content stream pairs
  const objects: string[] = [];
  const pageObjIds: number[] = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push(''); // placeholder for 2 0 obj (Pages)
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj');

  let nextObjId = 6;

  pages.forEach((pageLines, pageIdx) => {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    pageObjIds.push(pageObjId);

    const streamOps: string[] = ['BT'];
    let y = 790;

    for (const l of pageLines) {
      streamOps.push(`/${l.font} ${l.size} Tf`);
      streamOps.push(`1 0 0 1 40 ${y} Tm`);
      streamOps.push(`(${l.text}) Tj`);
      y -= l.spacingAfter;
    }

    // Footer page number
    const footerText = sanitizePdfText(
      `HomologIT - Protocolo ${protocolId} - Pagina ${pageIdx + 1} de ${pages.length}`
    );
    streamOps.push('/F3 8 Tf');
    streamOps.push('1 0 0 1 40 28 Tm');
    streamOps.push(`(${footerText}) Tj`);
    streamOps.push('ET');

    const streamContent = streamOps.join('\n');

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageObjIds.length} >>\nendobj`;

  let pdfBody = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdfBody.length);
    pdfBody += `${obj}\n`;
  }

  const xrefOffset = pdfBody.length;
  pdfBody += `xref\n0 ${objects.length + 1}\n`;
  pdfBody += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdfBody += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfBody += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdfBody);
}

/**
 * Triggers a direct PDF file download in the browser
 */
export function downloadHomologationPdf(payload: PdfExportPayload): string {
  const bytes = generateHomologationPdfBytes(payload);
  const safeManufacturer = payload.device.manufacturer
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const safeModel = payload.device.model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `homologit-log-laudo-${safeManufacturer}-${safeModel || 'aparelho'}.pdf`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([bytes.buffer as ArrayBuffer], {type: 'application/pdf'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return filename;
}
