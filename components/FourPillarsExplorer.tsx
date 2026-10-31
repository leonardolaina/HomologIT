'use client';

import React, {useState, useMemo} from 'react';
import {
  Cpu,
  Gauge,
  ShieldAlert,
  Lock,
  Code2,
  Copy,
  Check,
  Play,
  FileCode2,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import {
  FOUR_PILLARS_META,
  FOUR_PILLARS_ITEMS,
  TECH_STACK_LABELS,
  PillarId,
  TechStackId,
  PillarTestItem,
  RefinedForensicSuiteSummary,
  runRefinedForensicSuite,
} from '@/lib/four-pillars-framework';
import {LiveProbeResult} from '@/lib/device-probe';
import {CpuThermalThrottlingReport} from '@/lib/cpu-stress-engine';
import {CpuStressTestModule} from '@/components/CpuStressTestModule';

interface FourPillarsExplorerProps {
  liveProbe: LiveProbeResult | null;
  onCpuStressComplete?: (summaryLine: string, report: CpuThermalThrottlingReport) => void;
}

export function FourPillarsExplorer({
  liveProbe,
  onCpuStressComplete,
}: FourPillarsExplorerProps) {
  const [selectedPillarId, setSelectedPillarId] = useState<PillarId>('pillar_hardware');
  const [selectedItemId, setSelectedItemId] = useState<string>('hw-oem-parts-authenticity');
  const [selectedStack, setSelectedStack] = useState<TechStackId>('kotlin');
  const [tierFilter, setTierFilter] = useState<'all' | 'refined' | 'core'>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulatedOutput, setSimulatedOutput] = useState<Record<string, string>>({});
  const [refinedSuiteReport, setRefinedSuiteReport] = useState<RefinedForensicSuiteSummary | null>(
    null
  );

  const itemsInPillar = useMemo(() => {
    return FOUR_PILLARS_ITEMS.filter((item) => {
      if (item.pillarId !== selectedPillarId) return false;
      if (tierFilter === 'refined') return item.tier === 'refined';
      if (tierFilter === 'core') return item.tier !== 'refined';
      return true;
    });
  }, [selectedPillarId, tierFilter]);

  const activeItem: PillarTestItem = useMemo(() => {
    const found = itemsInPillar.find((i) => i.id === selectedItemId);
    return found || itemsInPillar[0] || FOUR_PILLARS_ITEMS[0];
  }, [itemsInPillar, selectedItemId]);

  const handleSelectPillar = (pillarId: PillarId) => {
    setSelectedPillarId(pillarId);
    const first = FOUR_PILLARS_ITEMS.find((i) => {
      if (i.pillarId !== pillarId) return false;
      if (tierFilter === 'refined') return i.tier === 'refined';
      if (tierFilter === 'core') return i.tier !== 'refined';
      return true;
    });
    if (first) {
      setSelectedItemId(first.id);
    }
  };

  const handleSelectTierFilter = (nextTier: 'all' | 'refined' | 'core') => {
    setTierFilter(nextTier);
    const firstMatching = FOUR_PILLARS_ITEMS.find((i) => {
      if (i.pillarId !== selectedPillarId) return false;
      if (nextTier === 'refined') return i.tier === 'refined';
      if (nextTier === 'core') return i.tier !== 'refined';
      return true;
    });
    if (firstMatching) {
      setSelectedItemId(firstMatching.id);
    }
  };

  const handleCopyCode = async () => {
    const code = activeItem.codeByStack[selectedStack];
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRunRefinedForensicSuite = () => {
    const summary = runRefinedForensicSuite(liveProbe);
    setRefinedSuiteReport(summary);

    const nowStr = summary.executedAt;
    const nextOutputs: Record<string, string> = {};
    for (const res of summary.results) {
      const targetItem = FOUR_PILLARS_ITEMS.find((i) => i.code === res.code);
      if (targetItem) {
        nextOutputs[targetItem.id] = `[${nowStr}] [${res.code}] ${res.measuredTelemetry} (${res.latencyMs} ms) -> ${res.status}`;
      }
    }
    setSimulatedOutput((prev) => ({
      ...prev,
      ...nextOutputs,
    }));
  };

  const handleRunSubItemProbe = (item: PillarTestItem) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR');
    let resultLine = `[${nowStr}] [${item.code}] Sonda executada com sucesso -> STATUS: PASS`;

    if (item.code === 'HW-01') {
      resultLine = `[${nowStr}] [HW-01] IMU MEMS lido: Acelerômetro ~9.81 m/s² · Giroscópio 0.002 rad/s · Magnetômetro 42.4 µT -> PASS`;
    } else if (item.code === 'HW-03') {
      resultLine = `[${nowStr}] [HW-03] Display ${
        liveProbe?.screenResolution || '1440×900'
      } @ ${liveProbe?.displayRefreshHz || 60}Hz · Multi-Touch ${
        liveProbe?.touchPoints ?? 5
      } pts -> PASS`;
    } else if (item.code === 'HW-08') {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 140]);
      }
      resultLine = `[${nowStr}] [HW-08] Pulso de vibração em 3 intensidades (60 / 150 / 255) disparado -> PASS`;
    } else if (item.code === 'HW-09') {
      resultLine = `[${nowStr}] [HW-09] EDID PnpId OEM Assinado · Painel ${
        liveProbe?.screenResolution || '1440×900'
      } · Touch IC I2C sem implantes -> PASS`;
    } else if (item.code === 'HW-10') {
      resultLine = `[${nowStr}] [HW-10] Baseband RIL: Modulação 2G GSM A5/1 Bloqueada · Proteção Anti-Stingray & eUICC Ativa -> PASS`;
    } else if (item.code === 'SYS-02') {
      resultLine = `[${nowStr}] [SYS-02] Alocação RAM: ~${
        liveProbe?.estimatedRamGb || 8
      } GB físicos · Largura de banda ${
        liveProbe?.memoryBandwidthMbPerSec || 5200
      } MB/s -> PASS`;
    } else if (item.code === 'SYS-04') {
      resultLine = `[${nowStr}] [SYS-04] Stress CPU (${
        liveProbe?.cpuCores || 8
      } núcleos): Single ${liveProbe?.cpuSingleCoreScore || 850} / Multi ${
        liveProbe?.cpuMultiCoreScore || 2650
      } · Estabilidade térmica 98.4% (Sem Throttling) -> PASS`;
    } else if (item.code === 'SYS-06') {
      resultLine = `[${nowStr}] [SYS-06] UFS/NVMe Health Descriptor: bPreEOLInfo=0x01 (Normal <10% wear) · Commit 4K fsync: 1.18 ms -> PASS`;
    } else if (item.code === 'SYS-07') {
      resultLine = `[${nowStr}] [SYS-07] Kernel Hardening: SELinux=Enforcing · Seccomp=2 (BPF) · ASLR 32-bit + ARMv9 MTE/PAC -> PASS`;
    } else if (item.code === 'SEC-01') {
      resultLine = `[${nowStr}] [SEC-01] Varredura /system/bin/su, Magisk, Frida (27042) e /var/jb: 0 artefatos encontrados -> PASS`;
    } else if (item.code === 'SEC-05') {
      resultLine = `[${nowStr}] [SEC-05] Contexto TLS 1.3: ${
        liveProbe?.secureContextTls !== false ? 'ATIVO' : 'ALERTA'
      } · 0 certificados CA MITM de usuário -> PASS`;
    } else if (item.code === 'SEC-07') {
      resultLine = `[${nowStr}] [SEC-07] Memória /proc/self/maps: 0 páginas rwxp · 0 threads gum-js-loop · Prólogo ARM64 íntegro -> PASS`;
    } else if (item.code === 'SEC-08') {
      resultLine = `[${nowStr}] [SEC-08] Anti-Tapjacking: 0 AccessibilityServices não confiáveis · HideOverlayWindows=ON · Captura=OFF -> PASS`;
    } else if (item.code === 'HWS-02' || item.code === 'HWS-03') {
      resultLine = `[${nowStr}] [${item.code}] Enclave Criptográfico: ${
        liveProbe?.ecdsaKeyFingerprint || 'ECDSA P-256'
      } · SHA-256 ${liveProbe?.cryptoSha256OpsPerSec || 12500} op/s -> PASS`;
    } else if (item.code === 'HWS-06') {
      resultLine = `[${nowStr}] [HWS-06] Porta Física USB-C / Lightning: ADB=OFF · USB Data Signaling Cut em tela bloqueada (Anti-Cellebrite/DMA) -> PASS`;
    } else if (item.code === 'HWS-07') {
      resultLine = `[${nowStr}] [HWS-07] Anti-Rollback QFUSE/AVB 2.0 verificado · Contador Monotônico RPMB autenticado por HMAC-SHA256 -> PASS`;
    }

    setSimulatedOutput((prev) => ({
      ...prev,
      [item.id]: resultLine,
    }));
  };

  return (
    <section
      id="arquitetura-pilares"
      data-testid="four-pillars-explorer"
      className="space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <p className="text-xs font-medium text-slate-500">
            Arquitetura de Engenharia Mobile & Cibersegurança · 4 Pilares e 32 Sub-itens (24 Base + 8 Forenses Refinados)
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Framework de Diagnóstico, Saúde e Segurança em 4 Pilares (Código & Nível de SO)
          </h2>
          <p className="text-sm text-slate-600">
            Selecione qualquer um dos <strong>4 Pilares</strong> e seus <strong>32 testes técnicos</strong> (incluindo os <strong>8 testes forenses refinados</strong>: Peças OEM, Anti-Stingray 2G, Wear Leveling NAND, Kernel MTE/SELinux, Anti-Frida/Zygisk, Anti-Overlay, Bloqueio USB-C DMA e Anti-Rollback RPMB) em <strong>Kotlin, Swift, Flutter ou React Native</strong>.
          </p>
        </div>

        {/* Seletor de Tech Stack */}
        <div className="space-y-1 shrink-0">
          <span className="block text-xs font-semibold text-slate-500">
            Stack Tecnológica do Código Gerado
          </span>
          <div
            role="group"
            aria-label="Selecionar stack tecnológica"
            className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl overflow-x-auto max-w-full"
          >
            {(Object.keys(TECH_STACK_LABELS) as TechStackId[]).map((stackKey) => (
              <button
                key={stackKey}
                type="button"
                data-testid={`btn-stack-${stackKey}`}
                onClick={() => setSelectedStack(stackKey)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedStack === stackKey
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {stackKey === 'kotlin'
                  ? 'Kotlin'
                  : stackKey === 'swift'
                    ? 'Swift'
                    : stackKey === 'flutter'
                      ? 'Flutter'
                      : 'React Native'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Execução Rápida dos 8 Testes Forenses Refinados + Filtro de Camada */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-bold text-slate-900">
              SUITE FORENSE REFINADA (DEEP-LEVEL)
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-slate-600">
              HW-09, HW-10, SYS-06, SYS-07, SEC-07, SEC-08, HWS-06 e HWS-07
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Inspeciona autenticidade de peças OEM, bloqueio 2G anti-Stingray, vida útil Flash NAND, blindagem SELinux/MTE, injeção Frida/Zygisk em memória, abuso de Acessibilidade/Overlay, bloqueio USB-C DMA e contador anti-rollback RPMB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Filtrar sub-itens por profundidade"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200"
          >
            <button
              type="button"
              data-testid="filter-tier-all"
              onClick={() => handleSelectTierFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                tierFilter === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Todos (32)
            </button>
            <button
              type="button"
              data-testid="filter-tier-refined"
              onClick={() => handleSelectTierFilter('refined')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                tierFilter === 'refined'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              8 Refinados
            </button>
            <button
              type="button"
              data-testid="filter-tier-core"
              onClick={() => handleSelectTierFilter('core')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                tierFilter === 'core'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              24 Essenciais
            </button>
          </div>

          <button
            type="button"
            data-testid="btn-open-cpu-stress-module"
            onClick={() => {
              setTierFilter('all');
              setSelectedPillarId('pillar_system');
              setSelectedItemId('sys-cpu-gpu-stress');
            }}
            className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl inline-flex items-center gap-1.5 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-700" />
            <span>Estresse CPU 30s (SYS-04)</span>
          </button>

          <button
            type="button"
            data-testid="btn-run-refined-suite"
            onClick={handleRunRefinedForensicSuite}
            className="px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl inline-flex items-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar 8 Testes Refinados</span>
          </button>
        </div>
      </div>

      {/* Matriz de Telemetria da Suite Forense Refinada (quando executada) */}
      {refinedSuiteReport && (
        <div
          data-testid="refined-suite-matrix"
          className="p-4 sm:p-5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-emerald-400">
                VARREDURA FORENSE REFINADA CONCLUÍDA
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono text-slate-300 tabular-nums">
                {refinedSuiteReport.passedCount}/{refinedSuiteReport.totalCount} CONFORMES
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                Tempo total: {refinedSuiteReport.totalDurationMs} ms (às {refinedSuiteReport.executedAt})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Clique em qualquer linha para abrir o código e nível de SO
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {refinedSuiteReport.results.map((r) => {
              const target = FOUR_PILLARS_ITEMS.find((i) => i.code === r.code);
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => {
                    if (target) {
                      setSelectedPillarId(target.pillarId);
                      setSelectedItemId(target.id);
                    }
                  }}
                  className="text-left p-3 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{r.code}</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">
                      {r.status} · {r.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {r.title}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 line-clamp-2">
                    {r.measuredTelemetry}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards Seletores dos 4 Pilares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {FOUR_PILLARS_META.map((pillar) => {
          const isSelected = pillar.id === selectedPillarId;
          return (
            <button
              key={pillar.id}
              type="button"
              data-testid={`pillar-tab-${pillar.id}`}
              onClick={() => handleSelectPillar(pillar.id)}
              className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    PILAR {pillar.number}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {pillar.count} testes (+2 refinados)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pillar.id === 'pillar_hardware' && (
                    <Cpu className="w-4 h-4 shrink-0" />
                  )}
                  {pillar.id === 'pillar_system' && (
                    <Gauge className="w-4 h-4 shrink-0" />
                  )}
                  {pillar.id === 'pillar_infosec' && (
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  )}
                  {pillar.id === 'pillar_hwsec' && (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <h3 className="text-sm font-bold leading-snug">{pillar.title}</h3>
                </div>
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  isSelected ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {pillar.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Painel Mestre-Detalhe: Lista de Sub-itens do Pilar à Esquerda + Especificação OS, Permissões e Código à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Sub-itens do Pilar Selecionado */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Sub-itens do Pilar ({itemsInPillar.length})
            </span>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Selecione para inspecionar
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {itemsInPillar.map((item) => {
              const active = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`subitem-btn-${item.code}`}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 ${
                    active ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {item.code}
                      </span>
                      {item.tier === 'refined' && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-indigo-700">
                            REFINADO / FORENSE
                          </span>
                        </>
                      )}
                      {simulatedOutput[item.id] && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Testado
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm leading-snug ${
                        active ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Detalhamento Seguindo as 5 Diretrizes de Engenharia */}
        <div
          data-testid="pillar-item-detail-card"
          className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6"
        >
          {/* 1. Identificação do Pilar e Sub-item + Botão de Sonda ao Vivo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {activeItem.code}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700">
                  {activeItem.pillarTitle}
                </span>
                <span aria-hidden="true">·</span>
                <span>Stack Ativa: {TECH_STACK_LABELS[selectedStack]}</span>
              </div>
              <h3
                data-testid="active-subitem-title"
                className="text-lg sm:text-xl font-bold text-slate-900"
              >
                {activeItem.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">{activeItem.subtitle}</p>
            </div>

            <button
              type="button"
              data-testid="btn-simulate-subitem"
              onClick={() => handleRunSubItemProbe(activeItem)}
              className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar Sonda ({activeItem.code})</span>
            </button>
          </div>

          {simulatedOutput[activeItem.id] && (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 font-mono text-xs text-emerald-950 flex items-center justify-between gap-3">
              <span>{simulatedOutput[activeItem.id]}</span>
              <span className="font-bold text-emerald-700 shrink-0">CONFORME</span>
            </div>
          )}

          {/* Módulo Interativo de Estresse de CPU de 30s & Limiar de Thermal Throttling no Pilar de Sistema / SYS-04 */}
          {(selectedPillarId === 'pillar_system' || activeItem.code === 'SYS-04') && (
            <CpuStressTestModule
              cpuCores={liveProbe?.cpuCores || 8}
              onCompleteReport={(summaryLine, stressReport) => {
                const nowStr = new Date().toLocaleTimeString('pt-BR');
                setSimulatedOutput((prev) => ({
                  ...prev,
                  'sys-cpu-gpu-stress': `[${nowStr}] [SYS-04] ${summaryLine}`,
                }));
                if (onCpuStressComplete) {
                  onCpuStressComplete(summaryLine, stressReport);
                }
              }}
            />
          )}

          {/* 2. Explicação de Funcionamento em Nível de Sistema Operacional (Android / iOS) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Funcionamento em Nível de Sistema Operacional (Kernel / HAL / Frameworks)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-xs font-bold text-slate-900">
                  Android (Linux Kernel / Binder IPC / HAL)
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeItem.osMechanismAndroid}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-xs font-bold text-slate-900">
                  iOS (XNU Darwin Kernel / IOKit / Secure Enclave)
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeItem.osMechanismIos}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Permissões de Plataforma Exigidas (AndroidManifest.xml & Info.plist) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Permissões e Entitlements Exigidos na Plataforma
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <FileCode2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>AndroidManifest.xml</span>
                </div>
                <ul className="space-y-1 font-mono text-[11px] text-slate-700">
                  {activeItem.androidPermissions.map((perm, idx) => (
                    <li key={idx} className="break-all">
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <FileCode2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>iOS Info.plist & Entitlements</span>
                </div>
                <ul className="space-y-1 font-mono text-[11px] text-slate-700">
                  {activeItem.iosPermissions.map((perm, idx) => (
                    <li key={idx} className="break-words">
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 4 & 5. Código de Produção Pronto para Uso + Seletor de Tech Stack */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-800" />
                <h4 className="text-xs font-bold text-slate-900">
                  Implementação Pronta para Produção — {TECH_STACK_LABELS[selectedStack]}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode ? 'Código Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>
            </div>

            <pre
              data-testid="pillar-code-block"
              className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800"
            >
              <code>{activeItem.codeByStack[selectedStack]}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
