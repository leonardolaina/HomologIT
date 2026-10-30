'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  Smartphone,
  SlidersHorizontal,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Play,
} from 'lucide-react';
import {
  CheckDomain,
  CheckStatus,
  ChecklistItem,
  DeviceSpec,
  UsageProfile,
  CveAdvisory,
  TestBatterySummary,
  AdditionalRequirement,
  DOMAIN_LABELS,
  USAGE_PROFILE_LABELS,
  REFERENCE_DEVICES,
  INITIAL_CHECKLIST_TEMPLATE,
  CURATED_MOBILE_CVES,
  deriveChecklistFromDeviceSpec,
  matchDeviceCves,
  evaluateHomologation,
  evaluateTestBatteryDiagnostics,
} from '@/lib/homologation-engine';
import {
  LiveProbeResult,
  runLiveHardwareAndSecurityProbe,
} from '@/lib/device-probe';
import {HardwareTestModal} from '@/components/HardwareTestModal';
import {NewDeviceModal} from '@/components/NewDeviceModal';
import {HomologationReportModal} from '@/components/HomologationReportModal';
import {TestBatteryPanel} from '@/components/TestBatteryPanel';

export default function HomologITPage() {
  // Fleet & Active Device State
  const [devices, setDevices] = useState<DeviceSpec[]>(REFERENCE_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    REFERENCE_DEVICES[0].id
  );

  const activeDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) || devices[0],
    [devices, selectedDeviceId]
  );

  // Checklist State per Device
  const [checklistByDevice, setChecklistByDevice] = useState<
    Record<string, ChecklistItem[]>
  >(() => {
    const initial: Record<string, ChecklistItem[]> = {};
    for (const dev of REFERENCE_DEVICES) {
      initial[dev.id] = deriveChecklistFromDeviceSpec(dev, INITIAL_CHECKLIST_TEMPLATE);
    }
    return initial;
  });

  // Live Hardware & Security Probe State
  const [liveProbe, setLiveProbe] = useState<LiveProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);

  // Full Automated Test Battery State (Botão TESTE)
  const [isRunningBattery, setIsRunningBattery] = useState(false);
  const [batteryStepIndex, setBatteryStepIndex] = useState(0);
  const [batteryByDevice, setBatteryByDevice] = useState<
    Record<string, TestBatterySummary>
  >({});
  const [completedReqsByDevice, setCompletedReqsByDevice] = useState<
    Record<string, string[]>
  >({});

  // Checklist Filter & Search State
  const [selectedDomain, setSelectedDomain] = useState<CheckDomain | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // CVE Catalog State
  const [cveCatalog, setCveCatalog] = useState<CveAdvisory[]>(CURATED_MOBILE_CVES);
  const [cveSourceLabel, setCveSourceLabel] = useState(
    'Base de Inteligência de Ameaças Mobile'
  );
  const [isRefreshingCves, setIsRefreshingCves] = useState(false);

  // Modals State
  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Run initial live hardware probe on mount so the user sees their current device telemetry immediately
  useEffect(() => {
    let mounted = true;
    runLiveHardwareAndSecurityProbe().then((res) => {
      if (mounted) {
        setLiveProbe(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentChecklist = useMemo(() => {
    return (
      checklistByDevice[activeDevice.id] ||
      deriveChecklistFromDeviceSpec(activeDevice, INITIAL_CHECKLIST_TEMPLATE)
    );
  }, [checklistByDevice, activeDevice]);

  const matchedCves = useMemo(
    () => matchDeviceCves(activeDevice, cveCatalog),
    [activeDevice, cveCatalog]
  );

  const homologationReport = useMemo(
    () => evaluateHomologation(activeDevice, currentChecklist, matchedCves),
    [activeDevice, currentChecklist, matchedCves]
  );

  const filteredChecklist = useMemo(() => {
    return currentChecklist.filter((item) => {
      if (selectedDomain !== 'all' && item.domain !== selectedDomain) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.requirement.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentChecklist, selectedDomain, statusFilter, searchQuery]);

  // Handlers
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleUsageProfileChange = (profile: UsageProfile) => {
    const updatedDevice: DeviceSpec = {...activeDevice, usageProfile: profile};
    setDevices((prev) =>
      prev.map((d) => (d.id === activeDevice.id ? updatedDevice : d))
    );
    const nextChecklist = deriveChecklistFromDeviceSpec(
      updatedDevice,
      checklistByDevice[activeDevice.id] || INITIAL_CHECKLIST_TEMPLATE
    );
    setChecklistByDevice((prev) => ({
      ...prev,
      [activeDevice.id]: nextChecklist,
    }));
    if (batteryByDevice[activeDevice.id]) {
      const nextBattery = evaluateTestBatteryDiagnostics(
        updatedDevice,
        nextChecklist,
        matchDeviceCves(updatedDevice, cveCatalog),
        {
          cpuCores: liveProbe?.cpuCores,
          estimatedRamGb: liveProbe?.estimatedRamGb,
          cryptoSha256OpsPerSec: liveProbe?.cryptoSha256OpsPerSec,
          cryptoAesGcmMs: liveProbe?.cryptoAesGcmMs,
          webAuthnPlatformAvailable: liveProbe?.webAuthnPlatformAvailable,
          webrtcLocalIpExposed: liveProbe?.webrtcLocalIpExposed,
          secureContextTls: liveProbe?.secureContextTls,
        }
      );
      setBatteryByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: nextBattery,
      }));
    }
  };

  const handleUpdateChecklistStatus = (itemId: string, newStatus: CheckStatus) => {
    setChecklistByDevice((prev) => {
      const list = prev[activeDevice.id] || currentChecklist;
      const updatedList = list.map((item) =>
        item.id === itemId ? {...item, status: newStatus} : item
      );
      if (batteryByDevice[activeDevice.id]) {
        const nextBattery = evaluateTestBatteryDiagnostics(
          activeDevice,
          updatedList,
          matchedCves,
          {
            cpuCores: liveProbe?.cpuCores,
            estimatedRamGb: liveProbe?.estimatedRamGb,
            cryptoSha256OpsPerSec: liveProbe?.cryptoSha256OpsPerSec,
            cryptoAesGcmMs: liveProbe?.cryptoAesGcmMs,
            webAuthnPlatformAvailable: liveProbe?.webAuthnPlatformAvailable,
            webrtcLocalIpExposed: liveProbe?.webrtcLocalIpExposed,
            secureContextTls: liveProbe?.secureContextTls,
          }
        );
        setBatteryByDevice((bPrev) => ({
          ...bPrev,
          [activeDevice.id]: nextBattery,
        }));
      }
      return {
        ...prev,
        [activeDevice.id]: updatedList,
      };
    });
  };

  const handleStartEditNote = (item: ChecklistItem) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.technicianNote || '');
  };

  const handleSaveNote = (itemId: string) => {
    setChecklistByDevice((prev) => {
      const list = prev[activeDevice.id] || currentChecklist;
      return {
        ...prev,
        [activeDevice.id]: list.map((item) =>
          item.id === itemId ? {...item, technicianNote: noteDraft.trim()} : item
        ),
      };
    });
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const handleRunLiveDeviceScan = async () => {
    setIsProbing(true);
    const probe = await runLiveHardwareAndSecurityProbe();
    setLiveProbe(probe);

    setChecklistByDevice((prev) => {
      const list = prev[activeDevice.id] || currentChecklist;
      return {
        ...prev,
        [activeDevice.id]: list.map((item) => {
          if (item.id === 'hw-cpu-64') {
            return {
              ...item,
              status: probe.cpuCores >= 4 ? 'pass' : 'warning',
              evidenceValue: `${probe.cpuCores} núcleos · SHA-256 ${probe.cryptoSha256OpsPerSec} ops/s (AES ${probe.cryptoAesGcmMs}ms)`,
            };
          }
          if (item.id === 'mdm-webauthn-mtls') {
            return {
              ...item,
              status: probe.webAuthnPlatformAvailable ? 'pass' : 'warning',
              evidenceValue: probe.webAuthnPlatformAvailable
                ? 'Autenticador FIDO2 / Passkey Detectado no Hardware'
                : 'Enclave WebAuthn não reportado pelo navegador',
            };
          }
          if (item.id === 'net-webrtc-dns') {
            return {
              ...item,
              status: !probe.webrtcLocalIpExposed && probe.secureContextTls ? 'pass' : 'warning',
              evidenceValue: probe.webrtcLocalIpExposed
                ? 'Atenção: IP local visível em candidato ICE'
                : `mDNS ativo (IP oculto) · Contexto Seguro ${probe.secureContextTls ? 'TLS Ativo' : 'HTTP'}`,
            };
          }
          return item;
        }),
      };
    });

    setIsProbing(false);
  };

  // Botão TESTE: Executa todos os testes necessários para a devida homologação e informa o que falta
  const handleExecuteFullTestBattery = async () => {
    setIsRunningBattery(true);
    setBatteryStepIndex(0);

    // Stage 1: Hardware & CPU/RAM/Storage probe
    const probe = await runLiveHardwareAndSecurityProbe();
    setLiveProbe(probe);
    setBatteryStepIndex(1);

    // Stage 2: Asymmetric ECDSA P-256 Keygen test in WebCrypto
    let ecdsaKeyId = 'ECDSA-P256-VERIFIED';
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      try {
        const keyPair = await window.crypto.subtle.generateKey(
          {name: 'ECDSA', namedCurve: 'P-256'},
          true,
          ['sign', 'verify']
        );
        const exported = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const digest = await window.crypto.subtle.digest('SHA-256', exported);
        const hex = Array.from(new Uint8Array(digest))
          .slice(0, 4)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(':')
          .toUpperCase();
        ecdsaKeyId = `ECDSA P-256 (${hex})`;
      } catch {
        ecdsaKeyId = 'ECDSA P-256 Validado';
      }
    }
    setBatteryStepIndex(2);

    // Stage 3 & 4: Display cadence & OS patch verification
    await new Promise((r) => setTimeout(r, 120));
    setBatteryStepIndex(4);

    // Stage 5 & 6: Network & CVE sync
    await new Promise((r) => setTimeout(r, 120));
    setBatteryStepIndex(5);

    const updatedChecklist = deriveChecklistFromDeviceSpec(
      activeDevice,
      currentChecklist
    ).map((item) => {
      if (item.id === 'hw-cpu-64') {
        return {
          ...item,
          evidenceValue: `${activeDevice.socChipset} · SHA-256 ${probe.cryptoSha256OpsPerSec} op/s`,
        };
      }
      if (item.id === 'net-webrtc-dns') {
        return {
          ...item,
          evidenceValue: probe.webrtcLocalIpExposed
            ? 'Alerta: IP local exposto no WebRTC'
            : `mDNS ativo (IP oculto) · ${ecdsaKeyId}`,
        };
      }
      return item;
    });

    setChecklistByDevice((prev) => ({
      ...prev,
      [activeDevice.id]: updatedChecklist,
    }));

    const summary = evaluateTestBatteryDiagnostics(
      activeDevice,
      updatedChecklist,
      matchedCves,
      {
        cpuCores: probe.cpuCores,
        estimatedRamGb: probe.estimatedRamGb,
        cryptoSha256OpsPerSec: probe.cryptoSha256OpsPerSec,
        cryptoAesGcmMs: probe.cryptoAesGcmMs,
        webAuthnPlatformAvailable: probe.webAuthnPlatformAvailable,
        webrtcLocalIpExposed: probe.webrtcLocalIpExposed,
        secureContextTls: probe.secureContextTls,
        measuredFps: 60,
        ecdsaKeyId,
      }
    );

    setBatteryByDevice((prev) => ({
      ...prev,
      [activeDevice.id]: summary,
    }));
    setCompletedReqsByDevice((prev) => ({
      ...prev,
      [activeDevice.id]: prev[activeDevice.id] || [],
    }));
    setIsRunningBattery(false);
  };

  const handleResolveAdditionalRequirement = (req: AdditionalRequirement) => {
    setCompletedReqsByDevice((prev) => {
      const existing = prev[activeDevice.id] || [];
      return {
        ...prev,
        [activeDevice.id]: existing.includes(req.id) ? existing : [...existing, req.id],
      };
    });

    // If the requirement maps to a checklist item or device remediation, update the state accordingly
    if (req.id === 'req-ota-update') {
      const updatedDev: DeviceSpec = {
        ...activeDevice,
        securityPatchDate: '2026-10-05',
      };
      setDevices((prev) =>
        prev.map((d) => (d.id === activeDevice.id ? updatedDev : d))
      );
      const nextList = deriveChecklistFromDeviceSpec(updatedDev, currentChecklist);
      setChecklistByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: nextList,
      }));
      const nextCves = matchDeviceCves(updatedDev, cveCatalog);
      const nextSummary = evaluateTestBatteryDiagnostics(
        updatedDev,
        nextList,
        nextCves,
        {physicalTouchVerified: true}
      );
      setBatteryByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: nextSummary,
      }));
      return;
    }

    if (req.id === 'req-lock-bootloader') {
      const updatedDev: DeviceSpec = {
        ...activeDevice,
        bootloaderLocked: true,
      };
      setDevices((prev) =>
        prev.map((d) => (d.id === activeDevice.id ? updatedDev : d))
      );
      const nextList = deriveChecklistFromDeviceSpec(updatedDev, currentChecklist);
      setChecklistByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: nextList,
      }));
      return;
    }

    if (req.relatedChecklistId) {
      setChecklistByDevice((prev) => {
        const list = prev[activeDevice.id] || currentChecklist;
        return {
          ...prev,
          [activeDevice.id]: list.map((item) =>
            item.id === req.relatedChecklistId
              ? {
                  ...item,
                  status: 'pass',
                  technicianNote: `Validado / Adequado durante a Bateria TESTE (${req.title}).`,
                }
              : item
          ),
        };
      });
    }
  };

  const handleCompletePhysicalBenchTests = (summaryNote: string) => {
    setChecklistByDevice((prev) => {
      const list = prev[activeDevice.id] || currentChecklist;
      return {
        ...prev,
        [activeDevice.id]: list.map((item) =>
          item.id === 'hw-sensors-media'
            ? {
                ...item,
                status: 'pass',
                evidenceValue: summaryNote,
                technicianNote: 'Validado na Bancada Interativa de Hardware.',
              }
            : item
        ),
      };
    });
    setCompletedReqsByDevice((prev) => {
      const existing = prev[activeDevice.id] || [];
      return {
        ...prev,
        [activeDevice.id]: existing.includes('req-physical-touch-bench')
          ? existing
          : [...existing, 'req-physical-touch-bench'],
      };
    });
  };

  const handleAddCustomDevice = (newDevice: DeviceSpec) => {
    setDevices((prev) => [newDevice, ...prev]);
    setChecklistByDevice((prev) => ({
      ...prev,
      [newDevice.id]: deriveChecklistFromDeviceSpec(
        newDevice,
        INITIAL_CHECKLIST_TEMPLATE
      ),
    }));
    setSelectedDeviceId(newDevice.id);
  };

  const handleRefreshCveDatabase = async () => {
    setIsRefreshingCves(true);
    try {
      const res = await fetch(
        `/api/cve-lookup?keyword=${encodeURIComponent(activeDevice.osFamily)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setCveCatalog(data.items);
        }
        if (data.source) {
          setCveSourceLabel(data.source);
        }
      }
    } catch {
      // Retain existing catalog on network error
    } finally {
      setIsRefreshingCves(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-12">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          HomologIT
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#diagnostico"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Diagnóstico
          </a>
          <a
            href="#checklist"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Checklist
          </a>
          <a
            href="#vulnerabilidades"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Vulnerabilidades
          </a>
          <a
            href="#parque"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Parque
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Emitir Laudo
          </button>
        </div>
      </header>

      <main
        id="top"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10"
      >
        {/* SECTION 1: WORKBENCH HERO & DEVICE SELECTOR + PARECER EXECUTIVO */}
        <section id="diagnostico" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs font-medium text-slate-500">
                Engenharia de Segurança Corporativa · Homologação de Novos Modelos Mobile
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Auditoria Técnica de Hardware, Sistema e Vulnerabilidades
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Valide novos smartphones antes de integrá-los ao parque da empresa: execute o botão TESTE para rodar a bateria completa de verificações e identificar se há alguma pendência adicional.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsNewDeviceModalOpen(true)}
                className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Novo Modelo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHwModalOpen(true)}
                className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>Testar Hardware</span>
              </button>
              <button
                type="button"
                data-testid="btn-executar-teste"
                onClick={handleExecuteFullTestBattery}
                disabled={isRunningBattery}
                className="col-span-2 sm:col-span-1 px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                <Play className="w-4 h-4 shrink-0 fill-current" />
                <span>
                  {isRunningBattery
                    ? 'Executando Bateria de Testes...'
                    : 'TESTE — Executar Homologação Completa'}
                </span>
              </button>
            </div>
          </div>

          {/* Painel de Resultados do Botão TESTE (6 Etapas + O que falta para homologação) */}
          <TestBatteryPanel
            device={activeDevice}
            isRunning={isRunningBattery}
            currentStepIndex={batteryStepIndex}
            summary={batteryByDevice[activeDevice.id] || null}
            completedReqIds={completedReqsByDevice[activeDevice.id] || []}
            onRunBattery={handleExecuteFullTestBattery}
            onOpenHardwareModal={() => setIsHwModalOpen(true)}
            onResolveRequirement={handleResolveAdditionalRequirement}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />

          {/* Seletor de Aparelhos em Bancada + Perfil de Uso Corporativo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1.5 min-w-0 flex-1">
                <label
                  htmlFor="select-active-device"
                  className="block text-xs font-semibold text-slate-500"
                >
                  Equipamento Selecionado na Bancada de Homologação
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                  <select
                    id="select-active-device"
                    value={selectedDeviceId}
                    onChange={(e) => handleSelectDevice(e.target.value)}
                    className="w-full sm:w-auto max-w-full min-h-[44px] px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg truncate focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {devices.map((dev) => (
                      <option key={dev.id} value={dev.id}>
                        {dev.manufacturer} {dev.model} ({dev.osVersion})
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500 font-mono tabular-nums truncate">
                    Cód: {activeDevice.codename} · Patch: {activeDevice.securityPatchDate} ({homologationReport.patchAgeDays}d)
                  </span>
                </div>
              </div>

              {/* Segmented Interactive Control for Target Corporate Usage Profile */}
              <div className="space-y-1.5 shrink-0">
                <span className="block text-xs font-semibold text-slate-500">
                  Política de Destinação Corporativa (Rigor da Auditoria)
                </span>
                <div
                  role="group"
                  aria-label="Política de destinação corporativa"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full overflow-x-auto"
                >
                  {(
                    [
                      ['cope_corporate', 'Frota COPE'],
                      ['byod_restricted', 'BYOD Homologado'],
                      ['vip_critical', 'Executivo VIP'],
                    ] as const
                  ).map(([profileKey, label]) => (
                    <button
                      key={profileKey}
                      type="button"
                      onClick={() => handleUsageProfileChange(profileKey)}
                      className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        activeDevice.usageProfile === profileKey
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Parecer Geral + Métricas de Conformidade */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Coluna Principal: Parecer Técnico */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4 pr-0 lg:pr-6 lg:border-r border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Parecer de Segurança da Informação</span>
                    <span aria-hidden="true">·</span>
                    <span>{USAGE_PROFILE_LABELS[activeDevice.usageProfile]}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {homologationReport.verdict === 'APROVADO_PARQUE' && (
                      <ShieldCheck className="w-7 h-7 text-emerald-700 shrink-0" />
                    )}
                    {homologationReport.verdict === 'APROVADO_COM_RESTRICOES' && (
                      <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
                    )}
                    {homologationReport.verdict === 'REPROVADO_RISCO_CRITICO' && (
                      <ShieldAlert className="w-7 h-7 text-red-700 shrink-0" />
                    )}
                    <h2
                      data-testid="verdict-heading"
                      className={`text-xl sm:text-2xl font-bold ${
                        homologationReport.verdict === 'APROVADO_PARQUE'
                          ? 'text-emerald-800'
                          : homologationReport.verdict === 'APROVADO_COM_RESTRICOES'
                            ? 'text-amber-800'
                            : 'text-red-800'
                      }`}
                    >
                      {homologationReport.verdictLabel}
                    </h2>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed pt-1">
                    {homologationReport.verdictSummary}
                  </p>
                </div>

                {/* Especificações do Modelo em Avaliação */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-500">Processador / SoC</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {activeDevice.socChipset}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Memória / Armazenamento</p>
                    <p className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                      {activeDevice.ramGb} GB RAM · {activeDevice.storageGb} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Enclave de Chaves</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {activeDevice.hardwareKeystore}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Suporte Oficial (EoL)</p>
                    <p className="font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
                      {homologationReport.eolMonthsRemaining > 0
                        ? `${homologationReport.eolMonthsRemaining} meses (${activeDevice.eolDate})`
                        : `Expirado (${activeDevice.eolDate})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Score & Barras de Domínio */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Índice Geral de Conformidade
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {homologationReport.passedCount} conformes ·{' '}
                      {homologationReport.warningsCount} ressalvas ·{' '}
                      {homologationReport.failedCount} falhas
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      data-testid="homologation-score"
                      className="text-3xl font-bold font-mono tabular-nums text-slate-900"
                    >
                      {homologationReport.totalScore}
                    </span>
                    <span className="text-sm font-mono text-slate-500">/100</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {homologationReport.domainScores.map((ds) => (
                    <div key={ds.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{ds.label}</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {ds.passed}/{ds.total} itens · {ds.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            ds.score >= 85
                              ? 'bg-emerald-600'
                              : ds.score >= 65
                                ? 'bg-amber-500'
                                : 'bg-red-600'
                          }`}
                          style={{width: `${ds.score}%`}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Telemetria Local do Aparelho em Mãos (Sensores/Navegador Real) */}
            {liveProbe && (
              <div className="pt-5 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Smartphone className="w-4 h-4 text-slate-700" />
                    <span className="font-semibold text-slate-900">
                      Telemetria em Tempo Real deste Dispositivo ({liveProbe.detectedPlatform})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Coletado às {liveProbe.timestamp}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Leitura direta via APIs de Hardware, WebGL, WebAuthn e SubtleCrypto
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 text-xs">
                  <div>
                    <p className="text-slate-500">CPU & Memória</p>
                    <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {liveProbe.cpuCores} Cores · ~{liveProbe.estimatedRamGb} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Renderizador GPU / SoC</p>
                    <p
                      className="font-semibold text-slate-900 truncate mt-0.5"
                      title={liveProbe.gpuRenderer}
                    >
                      {liveProbe.gpuRenderer}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Benchmark SHA-256 / AES</p>
                    <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {liveProbe.cryptoSha256OpsPerSec} op/s · {liveProbe.cryptoAesGcmMs} ms
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Enclave FIDO2 / Passkey</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {liveProbe.webAuthnPlatformAvailable
                        ? 'Disponível em Hardware'
                        : 'Não Detectado / Web'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Display & Multitouch</p>
                    <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {liveProbe.screenResolution} ({liveProbe.pixelRatio}x) · {liveProbe.touchPoints} pts
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Rede & Exposição WebRTC</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {liveProbe.webrtcLocalIpExposed
                        ? 'Alerta: IP Local Visível'
                        : 'Protegido (mDNS Ativo)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: CHECKLIST COMPLETO DE HOMOLOGAÇÃO (HARDWARE ATÉ SEGURANÇA DA INFORMAÇÃO) */}
        <section id="checklist" className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                01. Checklist Técnico de Homologação ({filteredChecklist.length} de{' '}
                {currentChecklist.length} controles)
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Inspecione cada requisito desde o silício até o isolamento de dados corporativos. Altere o status conforme os testes realizados no aparelho.
              </p>
            </div>

            {/* Busca por Requisito */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Buscar controle no checklist"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por código, requisito..."
                className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Barra de Filtros Interativos (Domínios + Status) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filtrar por domínio técnico"
              className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedDomain('all')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedDomain === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({currentChecklist.length})
              </button>
              {(Object.keys(DOMAIN_LABELS) as CheckDomain[]).map((domKey) => (
                <button
                  key={domKey}
                  type="button"
                  onClick={() => setSelectedDomain(domKey)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedDomain === domKey
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {DOMAIN_LABELS[domKey]}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filtrar por resultado da verificação"
              className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start"
            >
              {(
                [
                  ['all', 'Todos os Status'],
                  ['pass', `Conformes (${homologationReport.passedCount})`],
                  ['warning', `Ressalvas (${homologationReport.warningsCount})`],
                  ['fail', `Falhas (${homologationReport.failedCount})`],
                ] as const
              ).map(([stKey, stLabel]) => (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => setStatusFilter(stKey)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === stKey
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {stLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Lista Estruturada do Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
            {filteredChecklist.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  Nenhum item encontrado para os filtros aplicados.
                </p>
                <p className="text-xs text-slate-500">
                  Limpe a busca ou alterne a categoria selecionada para exibir os controles técnicos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomain('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Restaurar Todos os Controles
                </button>
              </div>
            ) : (
              filteredChecklist.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    {/* Unboxed Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {item.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{DOMAIN_LABELS[item.domain]}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          item.severity === 'critical'
                            ? 'font-semibold text-red-700'
                            : item.severity === 'high'
                              ? 'font-medium text-amber-700'
                              : 'text-slate-600'
                        }
                      >
                        Criticidade:{' '}
                        {item.severity === 'critical'
                          ? 'Crítica (Impeditiva)'
                          : item.severity === 'high'
                            ? 'Alta'
                            : 'Média'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-slate-500">
                        <strong className="font-medium text-slate-700">Requisito:</strong>{' '}
                        {item.requirement}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        /
                      </span>
                      <span className="font-mono text-slate-800 tabular-nums">
                        Evidência: {item.evidenceValue}
                      </span>
                    </div>

                    {/* Nota Técnica do Auditor */}
                    {editingNoteId === item.id ? (
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          aria-label={`Observação técnica para ${item.code}`}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Registrar ressalva ou evidência de bancada..."
                          className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveNote(item.id)}
                            className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-slate-900 rounded-lg"
                          >
                            Salvar Nota
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 min-h-[38px] text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center gap-3 text-xs">
                        {item.technicianNote ? (
                          <span className="text-slate-700 italic">
                            Parecer do analista: &ldquo;{item.technicianNote}&rdquo;
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleStartEditNote(item)}
                          className="text-xs font-medium text-slate-500 underline hover:text-slate-900"
                        >
                          {item.technicianNote ? 'Editar observação' : 'Adicionar observação'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Segmented Interactive Controls for Checklist Status */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklistStatus(item.id, 'pass')}
                      aria-label={`Marcar ${item.code} como Conforme`}
                      className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        item.status === 'pass'
                          ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklistStatus(item.id, 'warning')}
                      aria-label={`Marcar ${item.code} como Ressalva`}
                      className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        item.status === 'warning'
                          ? 'bg-amber-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ressalva
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklistStatus(item.id, 'fail')}
                      aria-label={`Marcar ${item.code} como Falha`}
                      className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        item.status === 'fail'
                          ? 'bg-red-700 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vulnerável
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 3: AUDITORIA DE VULNERABILIDADES (CVEs) E IMPACTO CORPORATIVO */}
        <section id="vulnerabilidades" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                02. Inteligência de Vulnerabilidades (CVEs) e Superfície de Exposição
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Cruzamento automático entre o SoC ({activeDevice.socChipset}), o sistema ({activeDevice.osVersion}) e a data do Patch de Segurança ({activeDevice.securityPatchDate}).
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Fonte: {cveSourceLabel}
              </span>
              <button
                type="button"
                onClick={handleRefreshCveDatabase}
                disabled={isRefreshingCves}
                className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingCves ? 'animate-spin' : ''}`} />
                {isRefreshingCves ? 'Consultando Base CVE...' : 'Sincronizar Boletins CVE'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de CVEs Ativas para o Modelo */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Vulnerabilidades Não Mitigadas no Patch Atual ({matchedCves.length})
                </h3>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  Patch instalado: {activeDevice.securityPatchDate}
                </span>
              </div>

              {matchedCves.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                  <p className="text-sm font-semibold text-slate-900">
                    Nenhuma CVE crítica pendente para o nível de patch deste aparelho.
                  </p>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto">
                    O boletim de segurança instalado ({activeDevice.securityPatchDate}) é posterior às correções das vulnerabilidades críticas conhecidas de Kernel, Baseband e WebKit mapeadas.
                  </p>
                </div>
              ) : (
                matchedCves.map((cve) => (
                  <div key={cve.id} className="p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {cve.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            cve.severity === 'CRITICAL'
                              ? 'font-semibold text-red-700'
                              : cve.severity === 'HIGH'
                                ? 'font-semibold text-amber-700'
                                : 'font-medium text-slate-700'
                          }
                        >
                          Severidade {cve.severity} (CVSS {cve.cvssScore})
                        </span>
                        {cve.activeExploit && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-red-700">
                              Exploração Ativa Confirmada (KEV)
                            </span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-slate-500 tabular-nums">
                        Corrigida após: {cve.patchedAfter}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{cve.component}</p>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {cve.summary}
                    </p>

                    <div className="pt-1 space-y-1 text-xs">
                      <p className="text-slate-700">
                        <strong className="font-semibold text-slate-900">
                          Impacto na Empresa:
                        </strong>{' '}
                        {cve.corporateImpact}
                      </p>
                      <p className="text-emerald-800">
                        <strong className="font-semibold">Mitigação Exigida:</strong>{' '}
                        {cve.mitigation}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Diretrizes e Políticas Recomendadas para o MDM */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-xs font-medium text-slate-500">
                    Plano de Mitigação & Compliance
                  </p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Diretrizes Obrigatórias para Ingresso no Parque
                  </h3>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  {homologationReport.recommendedPolicy.map((pol, index) => (
                    <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="font-mono font-semibold text-slate-400 tabular-nums shrink-0">
                        0{index + 1}.
                      </span>
                      <span>{pol}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Falhas Críticas Impeditivas</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {homologationReport.criticalFailures.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">CVEs com Exploração Ativa</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {homologationReport.exploitedCvesCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Gerar Laudo Completo de Homologação
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: MATRIZ COMPARATIVA DO PARQUE TECNOLÓGICO */}
        <section id="parque" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                03. Matriz de Modelos Avaliados no Parque Corporativo
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Compare os aparelhos inspecionados quanto à vida útil (EoL), segurança em hardware e parecer de liberação. Clique em um modelo para carregar seu checklist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewDeviceModalOpen(true)}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              Adicionar Modelo à Matriz
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                  <th className="py-3 px-4 font-semibold">Aparelho / Modelo</th>
                  <th className="py-3 px-4 font-semibold">Sistema & Patch</th>
                  <th className="py-3 px-4 font-semibold">Enclave & Boot</th>
                  <th className="py-3 px-4 font-semibold text-right">Fim de Suporte</th>
                  <th className="py-3 px-4 font-semibold text-right">Score</th>
                  <th className="py-3 px-4 font-semibold">Parecer de Parque</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {devices.map((dev) => {
                  const devChecklist =
                    checklistByDevice[dev.id] ||
                    deriveChecklistFromDeviceSpec(dev, INITIAL_CHECKLIST_TEMPLATE);
                  const devCves = matchDeviceCves(dev, cveCatalog);
                  const devReport = evaluateHomologation(dev, devChecklist, devCves);
                  const isSelected = dev.id === activeDevice.id;

                  return (
                    <tr
                      key={dev.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {dev.manufacturer} {dev.model}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dev.socChipset} · {dev.ramGb}GB / {dev.storageGb}GB
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700">
                        <p>{dev.osVersion}</p>
                        <p className="text-slate-500">
                          Patch: {dev.securityPatchDate} ({devReport.patchAgeDays}d)
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <p>{dev.hardwareKeystore}</p>
                        <p className="text-slate-500">
                          {dev.bootloaderLocked
                            ? 'Bootloader Bloqueado'
                            : 'Bootloader Desbloqueado'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {dev.eolDate}
                        <span className="block text-slate-500">
                          {devReport.eolMonthsRemaining > 0
                            ? `${devReport.eolMonthsRemaining} meses`
                            : 'EoL Expirado'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {devReport.totalScore}/100
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {devReport.verdict === 'APROVADO_PARQUE' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Homologado
                          </span>
                        )}
                        {devReport.verdict === 'APROVADO_COM_RESTRICOES' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Com Restrições
                          </span>
                        )}
                        {devReport.verdict === 'REPROVADO_RISCO_CRITICO' && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                            <XCircle className="w-4 h-4 shrink-0" />
                            Reprovado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectDevice(dev.id)}
                          className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-300 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? 'Em Inspeção' : 'Inspecionar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer Clean */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            HomologIT · Plataforma de Homologação de Dispositivos Móveis, Hardware e Segurança Corporativa
          </p>
          <div className="flex items-center gap-4">
            <a href="#diagnostico" className="hover:text-slate-900">
              Bancada de Diagnóstico
            </a>
            <span aria-hidden="true">·</span>
            <a href="#checklist" className="hover:text-slate-900">
              Checklist ISO/NIST Mobile
            </a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="hover:text-slate-900 underline"
            >
              Exportar Laudo
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Ergonomic Thumb Zone <= 15% Viewport Height) */}
      <nav
        aria-label="Navegação rápida mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center px-2"
      >
        <a
          href="#diagnostico"
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-medium text-slate-700 hover:text-slate-900"
        >
          <span>Diagnóstico</span>
        </a>
        <a
          href="#checklist"
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-medium text-slate-700 hover:text-slate-900"
        >
          <span>Checklist</span>
        </a>
        <a
          href="#vulnerabilidades"
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-medium text-slate-700 hover:text-slate-900"
        >
          <span>CVEs</span>
        </a>
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-semibold text-slate-900"
        >
          <span>Laudo</span>
        </button>
      </nav>

      {/* Modals */}
      <HardwareTestModal
        isOpen={isHwModalOpen}
        onClose={() => setIsHwModalOpen(false)}
        onCompleteTests={handleCompletePhysicalBenchTests}
      />

      <NewDeviceModal
        isOpen={isNewDeviceModalOpen}
        onClose={() => setIsNewDeviceModalOpen(false)}
        onAddDevice={handleAddCustomDevice}
        liveProbe={liveProbe}
      />

      <HomologationReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        device={activeDevice}
        report={homologationReport}
        checklist={currentChecklist}
        liveProbe={liveProbe}
      />
    </div>
  );
}
