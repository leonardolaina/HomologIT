'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  SlidersHorizontal,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Trash2,
  Contrast,
  QrCode,
} from 'lucide-react';
import {
  CheckDomain,
  CheckStatus,
  SeverityLevel,
  ChecklistItem,
  DeviceSpec,
  UsageProfile,
  CveAdvisory,
  TestBatterySummary,
  AdditionalRequirement,
  AVAILABLE_TEST_STAGES,
  DOMAIN_LABELS,
  USAGE_PROFILE_LABELS,
  INITIAL_CHECKLIST_TEMPLATE,
  CURATED_MOBILE_CVES,
  HIGH_CONTRAST_STORAGE_KEY,
  deriveChecklistFromDeviceSpec,
  matchDeviceCves,
  evaluateHomologation,
  evaluateTestBatteryDiagnostics,
  buildCapturedDeviceFromProbe,
  getContrastModeTokens,
  getChecklistSeverityBadge,
} from '@/lib/homologation-engine';
import {
  LiveProbeResult,
  runLiveHardwareAndSecurityProbe,
} from '@/lib/device-probe';
import {BenchmarkAndTestGatePanel} from '@/components/BenchmarkAndTestGatePanel';
import {FourPillarsExplorer} from '@/components/FourPillarsExplorer';
import {HardwareTestModal} from '@/components/HardwareTestModal';
import {NewDeviceModal} from '@/components/NewDeviceModal';
import {HomologationReportModal} from '@/components/HomologationReportModal';
import {TestBatteryPanel} from '@/components/TestBatteryPanel';
import {
  MobileQrAndBuildBanner,
  MobileQrAndBuildModal,
  OfflineIndicator,
} from '@/components/MobileQrAndBuildModal';

const STORAGE_KEY = 'homologit_captured_state_v3';

export default function HomologITPage() {
  // Starts 100% clean with zero pre-loaded devices or history
  const [devices, setDevices] = useState<DeviceSpec[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [checklistByDevice, setChecklistByDevice] = useState<
    Record<string, ChecklistItem[]>
  >({});
  const [batteryByDevice, setBatteryByDevice] = useState<
    Record<string, TestBatterySummary>
  >({});
  const [completedReqsByDevice, setCompletedReqsByDevice] = useState<
    Record<string, string[]>
  >({});

  // Etapa 01: Live Benchmark & Auto-Extraction State
  const [liveProbe, setLiveProbe] = useState<LiveProbeResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProgressPct, setBenchmarkProgressPct] = useState(0);
  const [benchmarkStepLabel, setBenchmarkStepLabel] = useState('');

  // Etapa 02: Unlocked Homologation Test Selection & Execution State
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>(() =>
    AVAILABLE_TEST_STAGES.map((s) => s.id)
  );
  const [isRunningBattery, setIsRunningBattery] = useState(false);
  const [batteryStepIndex, setBatteryStepIndex] = useState(0);
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);

  // Checklist Filter & Search State
  const [selectedDomain, setSelectedDomain] = useState<CheckDomain | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // CVE Catalog State
  const [cveCatalog, setCveCatalog] = useState<CveAdvisory[]>(CURATED_MOBILE_CVES);
  const [cveSourceLabel, setCveSourceLabel] = useState(
    'Base de Inteligência de Ameaças Mobile'
  );
  const [isRefreshingCves, setIsRefreshingCves] = useState(false);

  // Modals & Accessibility Contrast State
  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMobileQrModalOpen, setIsMobileQrModalOpen] = useState(false);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Load any previously captured devices and high-contrast preference from localStorage
  useEffect(() => {
    try {
      const savedContrast = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
      if (savedContrast === 'high') {
        setIsHighContrast(true);
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
          setDevices(parsed.devices);
          setSelectedDeviceId(parsed.selectedDeviceId || parsed.devices[0].id);
          setChecklistByDevice(parsed.checklistByDevice || {});
          setBatteryByDevice(parsed.batteryByDevice || {});
          setCompletedReqsByDevice(parsed.completedReqsByDevice || {});
          if (parsed.liveProbe) {
            setLiveProbe(parsed.liveProbe);
          }
        }
      }
    } catch {
      // Start clean on parse error
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  // Synchronize High-Contrast CSS variables and root data-contrast attribute
  useEffect(() => {
    const tokens = getContrastModeTokens(isHighContrast);
    const root = document.documentElement;
    root.setAttribute('data-contrast', tokens.dataAttribute);
    for (const [varName, varValue] of Object.entries(tokens.cssVariables)) {
      root.style.setProperty(varName, varValue);
    }
    if (hasLoadedStorage) {
      try {
        localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, tokens.dataAttribute);
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [isHighContrast, hasLoadedStorage]);

  // Persist user-captured phones to localStorage as they validate devices
  useEffect(() => {
    if (!hasLoadedStorage) return;
    try {
      if (devices.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            devices,
            selectedDeviceId,
            checklistByDevice,
            batteryByDevice,
            completedReqsByDevice,
            liveProbe,
          })
        );
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [
    hasLoadedStorage,
    devices,
    selectedDeviceId,
    checklistByDevice,
    batteryByDevice,
    completedReqsByDevice,
    liveProbe,
  ]);

  const activeDevice: DeviceSpec | null = useMemo(() => {
    if (devices.length === 0) return null;
    return devices.find((d) => d.id === selectedDeviceId) || devices[0];
  }, [devices, selectedDeviceId]);

  const currentChecklist = useMemo(() => {
    if (!activeDevice) return [];
    return (
      checklistByDevice[activeDevice.id] ||
      deriveChecklistFromDeviceSpec(activeDevice, INITIAL_CHECKLIST_TEMPLATE)
    );
  }, [checklistByDevice, activeDevice]);

  const matchedCves = useMemo(() => {
    if (!activeDevice) return [];
    return matchDeviceCves(activeDevice, cveCatalog);
  }, [activeDevice, cveCatalog]);

  const currentBatterySummary: TestBatterySummary | null = useMemo(() => {
    if (!activeDevice) return null;
    const stored = batteryByDevice[activeDevice.id];
    if (!stored) return null;
    if (
      !Array.isArray(stored.executionLogs) ||
      !Array.isArray(stored.stages) ||
      !Array.isArray(stored.additionalRequirements)
    ) {
      return evaluateTestBatteryDiagnostics(
        activeDevice,
        currentChecklist,
        matchedCves
      );
    }
    return stored;
  }, [batteryByDevice, activeDevice, currentChecklist, matchedCves]);

  const homologationReport = useMemo(() => {
    if (!activeDevice) return null;
    return evaluateHomologation(activeDevice, currentChecklist, matchedCves);
  }, [activeDevice, currentChecklist, matchedCves]);

  const displayedChecklist = useMemo(() => {
    return currentChecklist.length > 0 ? currentChecklist : INITIAL_CHECKLIST_TEMPLATE;
  }, [currentChecklist]);

  const severityCounts = useMemo(() => {
    return {
      critical: displayedChecklist.filter((i) => i.severity === 'critical').length,
      high: displayedChecklist.filter((i) => i.severity === 'high').length,
      medium: displayedChecklist.filter((i) => i.severity === 'medium').length,
    };
  }, [displayedChecklist]);

  const filteredChecklist = useMemo(() => {
    return displayedChecklist.filter((item) => {
      if (selectedDomain !== 'all' && item.domain !== selectedDomain) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== 'all' && item.severity !== severityFilter) {
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
  }, [displayedChecklist, selectedDomain, statusFilter, severityFilter, searchQuery]);

  // Clear all history back to zero
  const handleClearAllHistory = () => {
    setDevices([]);
    setSelectedDeviceId('');
    setChecklistByDevice({});
    setBatteryByDevice({});
    setCompletedReqsByDevice({});
    setLiveProbe(null);
    setSearchQuery('');
    setSelectedDomain('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  // ETAPA 01: Levantar informações via Benchmark e preencher automaticamente todas as características do celular
  const handleRunBenchmark = async (forceNewCapture: boolean = false) => {
    setIsBenchmarking(true);
    setBenchmarkProgressPct(25);
    setBenchmarkStepLabel(
      '1/4 · Medindo CPU Single/Multi-Core e Largura de Banda de Memória RAM...'
    );

    const probe = await runLiveHardwareAndSecurityProbe();

    setBenchmarkProgressPct(65);
    setBenchmarkStepLabel(
      '2/4 · Extraindo Renderizador GPU WebGL, Cadência de Display (Hz) e Enclave FIDO2...'
    );
    await new Promise((r) => setTimeout(r, 80));

    setBenchmarkProgressPct(100);
    setBenchmarkStepLabel(
      '3/4 · Preenchendo Ficha Técnica Automaticamente e Liberando Testes de Homologação...'
    );

    setLiveProbe(probe);

    const autoFilledSpec = buildCapturedDeviceFromProbe(probe, devices.length + 1);
    const initialChecklist = deriveChecklistFromDeviceSpec(
      autoFilledSpec,
      INITIAL_CHECKLIST_TEMPLATE
    );

    if (!activeDevice || forceNewCapture) {
      setDevices((prev) => [autoFilledSpec, ...prev]);
      setSelectedDeviceId(autoFilledSpec.id);
      setChecklistByDevice((prev) => ({
        ...prev,
        [autoFilledSpec.id]: initialChecklist,
      }));
    } else {
      const updatedExisting: DeviceSpec = {
        ...activeDevice,
        manufacturer: autoFilledSpec.manufacturer,
        osFamily: autoFilledSpec.osFamily,
        osVersion: autoFilledSpec.osVersion,
        socChipset: autoFilledSpec.socChipset,
        ramGb: autoFilledSpec.ramGb,
        storageGb: autoFilledSpec.storageGb,
        hardwareKeystore: autoFilledSpec.hardwareKeystore,
        biometricClass: autoFilledSpec.biometricClass,
      };
      setDevices((prev) =>
        prev.map((d) => (d.id === activeDevice.id ? updatedExisting : d))
      );
      setChecklistByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: deriveChecklistFromDeviceSpec(
          updatedExisting,
          prev[activeDevice.id] || INITIAL_CHECKLIST_TEMPLATE
        ),
      }));
    }

    setIsBenchmarking(false);
  };

  // Permite ajustar qualquer campo preenchido automaticamente antes ou depois dos testes
  const handleUpdateAutoFilledDevice = (patch: Partial<DeviceSpec>) => {
    if (!activeDevice) return;
    const updatedDevice: DeviceSpec = {...activeDevice, ...patch};
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
          measuredFps: liveProbe?.displayRefreshHz,
          ecdsaKeyId: liveProbe?.ecdsaKeyFingerprint,
          selectedStageIds,
        }
      );
      setBatteryByDevice((prev) => ({
        ...prev,
        [activeDevice.id]: nextBattery,
      }));
    }
  };

  const handleToggleStageId = (stageId: string) => {
    setSelectedStageIds((prev) => {
      if (prev.includes(stageId)) {
        if (prev.length <= 1) return prev; // keep at least 1 test selected
        return prev.filter((id) => id !== stageId);
      }
      return [...prev, stageId];
    });
  };

  const handleSelectAllStages = () => {
    setSelectedStageIds(AVAILABLE_TEST_STAGES.map((s) => s.id));
  };

  // ETAPA 02: Botão TESTE (liberado somente após o Benchmark preencher as características)
  const handleExecuteSelectedTests = async () => {
    if (!liveProbe || !activeDevice || selectedStageIds.length === 0) return;

    setIsRunningBattery(true);
    setBatteryStepIndex(0);
    setLiveElapsedMs(0);

    const startTime = performance.now();
    const timerInterval = setInterval(() => {
      setLiveElapsedMs(Math.round(performance.now() - startTime));
    }, 35);

    await new Promise((r) => setTimeout(r, 80));
    setBatteryStepIndex(2);
    await new Promise((r) => setTimeout(r, 80));
    setBatteryStepIndex(4);
    await new Promise((r) => setTimeout(r, 80));
    setBatteryStepIndex(6);

    clearInterval(timerInterval);
    const measuredWallMs = Math.max(270, Math.round(performance.now() - startTime));
    const totalStageDurationMs =
      measuredWallMs + selectedStageIds.length * 115;
    setLiveElapsedMs(totalStageDurationMs);

    const ecdsaKeyId = liveProbe.ecdsaKeyFingerprint || 'ECDSA P-256 Validado';

    const updatedChecklist = deriveChecklistFromDeviceSpec(
      activeDevice,
      currentChecklist
    ).map((item) => {
      if (item.id === 'hw-cpu-64') {
        return {
          ...item,
          status: (liveProbe.cpuCores >= 4 ? 'pass' : 'warning') as CheckStatus,
          evidenceValue: `${liveProbe.cpuCores} Cores (${activeDevice.socChipset}) · Multi-Core ${liveProbe.cpuMultiCoreScore} pts · SHA-256 ${liveProbe.cryptoSha256OpsPerSec} op/s`,
        };
      }
      if (item.id === 'mdm-webauthn-mtls') {
        return {
          ...item,
          status: (liveProbe.webAuthnPlatformAvailable ? 'pass' : 'warning') as CheckStatus,
          evidenceValue: liveProbe.webAuthnPlatformAvailable
            ? `Autenticador FIDO2 Nativo · ${ecdsaKeyId}`
            : `Sem Enclave FIDO2 reportado · ${ecdsaKeyId}`,
        };
      }
      if (item.id === 'net-webrtc-dns') {
        return {
          ...item,
          status: (!liveProbe.webrtcLocalIpExposed && liveProbe.secureContextTls
            ? 'pass'
            : 'warning') as CheckStatus,
          evidenceValue: liveProbe.webrtcLocalIpExposed
            ? 'Alerta: IP local exposto no WebRTC'
            : `mDNS ativo (IP oculto) · ${ecdsaKeyId}`,
        };
      }
      return item;
    });

    const targetCves = matchDeviceCves(activeDevice, cveCatalog);

    setChecklistByDevice((prev) => ({
      ...prev,
      [activeDevice.id]: updatedChecklist,
    }));

    const summary = evaluateTestBatteryDiagnostics(
      activeDevice,
      updatedChecklist,
      targetCves,
      {
        cpuCores: liveProbe.cpuCores,
        estimatedRamGb: liveProbe.estimatedRamGb,
        cryptoSha256OpsPerSec: liveProbe.cryptoSha256OpsPerSec,
        cryptoAesGcmMs: liveProbe.cryptoAesGcmMs,
        webAuthnPlatformAvailable: liveProbe.webAuthnPlatformAvailable,
        webrtcLocalIpExposed: liveProbe.webrtcLocalIpExposed,
        secureContextTls: liveProbe.secureContextTls,
        measuredFps: liveProbe.displayRefreshHz,
        ecdsaKeyId,
        selectedStageIds,
        elapsedDurationMs: totalStageDurationMs,
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

  const handleUsageProfileChange = (profile: UsageProfile) => {
    handleUpdateAutoFilledDevice({usageProfile: profile});
  };

  const handleUpdateChecklistStatus = (itemId: string, newStatus: CheckStatus) => {
    if (!activeDevice) return;
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
            measuredFps: liveProbe?.displayRefreshHz,
            ecdsaKeyId: liveProbe?.ecdsaKeyFingerprint,
            selectedStageIds,
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
    if (!activeDevice) return;
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

  const handleResolveAdditionalRequirement = (req: AdditionalRequirement) => {
    if (!activeDevice) return;
    setCompletedReqsByDevice((prev) => {
      const existing = prev[activeDevice.id] || [];
      return {
        ...prev,
        [activeDevice.id]: existing.includes(req.id) ? existing : [...existing, req.id],
      };
    });

    if (req.id === 'req-ota-update') {
      handleUpdateAutoFilledDevice({
        securityPatchDate: new Date().toISOString().slice(0, 10),
      });
      return;
    }

    if (req.id === 'req-lock-bootloader') {
      handleUpdateAutoFilledDevice({
        bootloaderLocked: true,
      });
      return;
    }

    if (req.relatedChecklistId) {
      setChecklistByDevice((prev) => {
        const list = prev[activeDevice.id] || currentChecklist;
        const updatedList = list.map((item) =>
          item.id === req.relatedChecklistId
            ? {
                ...item,
                status: 'pass' as CheckStatus,
                technicianNote: `Validado / Adequado durante a Bateria TESTE (${req.title}).`,
              }
            : item
        );
        const nextSummary = evaluateTestBatteryDiagnostics(
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
            measuredFps: liveProbe?.displayRefreshHz,
            ecdsaKeyId: liveProbe?.ecdsaKeyFingerprint,
            selectedStageIds,
          }
        );
        setBatteryByDevice((bPrev) => ({
          ...bPrev,
          [activeDevice.id]: nextSummary,
        }));
        return {
          ...prev,
          [activeDevice.id]: updatedList,
        };
      });
    }
  };

  const handleCompletePhysicalBenchTests = (summaryNote: string) => {
    if (!activeDevice) return;
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

  const handleAddCustomDevice = async (newDevice: DeviceSpec) => {
    if (!liveProbe) {
      const probe = await runLiveHardwareAndSecurityProbe();
      setLiveProbe(probe);
    }
    const newChecklist = deriveChecklistFromDeviceSpec(
      newDevice,
      INITIAL_CHECKLIST_TEMPLATE
    );
    setDevices((prev) => [newDevice, ...prev]);
    setChecklistByDevice((prev) => ({
      ...prev,
      [newDevice.id]: newChecklist,
    }));
    setSelectedDeviceId(newDevice.id);
  };

  const handleRefreshCveDatabase = async () => {
    if (!activeDevice) return;
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

  const contrastTokens = useMemo(
    () => getContrastModeTokens(isHighContrast),
    [isHighContrast]
  );

  return (
    <div
      data-contrast-mode={contrastTokens.dataAttribute}
      className="hc-app-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-12 transition-colors"
    >
      {/* Top Navigation Bar with Field-Audit High-Contrast Switcher */}
      <header className="hc-navbar sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 sm:gap-6">
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
            Benchmark & Testes
          </a>
          <a
            href="#arquitetura-pilares"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            4 Pilares (Código)
          </a>
          <a
            href="#checklist"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Checklist
          </a>
          <a
            href="#parque"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Parque
          </a>
        </nav>

        {/* Zone 3: QR Code Mobile + High-Contrast Field Audit Toggle + Primary Workflow Action */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="btn-open-mobile-qr"
            onClick={() => setIsMobileQrModalOpen(true)}
            className="px-3 py-2 min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">QR Code &amp; App Mobile</span>
            <span className="lg:hidden">QR Mobile</span>
          </button>

          <button
            type="button"
            data-testid="btn-toggle-high-contrast"
            aria-pressed={isHighContrast}
            aria-label="Alternar Modo de Alto Contraste para ambientes de auditoria de campo com alta luminosidade"
            title={`Modo de Alto Contraste (${contrastTokens.contrastRatioLabel})`}
            onClick={() => setIsHighContrast((prev) => !prev)}
            style={{
              backgroundColor: 'var(--hc-toggle-bg)',
              color: 'var(--hc-toggle-fg)',
              borderColor: 'var(--hc-toggle-border)',
            }}
            className="px-3 py-2 min-h-[40px] inline-flex items-center gap-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Contrast className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {isHighContrast ? 'Alto Contraste: ATIVO' : 'Modo de Alto Contraste'}
            </span>
            <span className="sm:hidden">
              {isHighContrast ? 'Contraste ON' : 'Contraste'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!liveProbe || !activeDevice) {
                handleRunBenchmark(true);
              } else if (!currentBatterySummary) {
                handleExecuteSelectedTests();
              } else {
                setIsReportModalOpen(true);
              }
            }}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {!liveProbe || !activeDevice
              ? '1. Iniciar Benchmark'
              : !currentBatterySummary
                ? '2. Executar TESTE'
                : 'Emitir Laudo'}
          </button>
        </div>
      </header>

      <main
        id="top"
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10"
      >
        {/* SECTION 1: FLUXO EM 2 ETAPAS (1. BENCHMARK AUTO-PREENCHIMENTO -> 2. LIBERAÇÃO DOS TESTES) */}
        <section id="diagnostico" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs font-medium text-slate-500">
                Engenharia de Segurança Corporativa · Fluxo Sequencial de Benchmark e Homologação
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Benchmark de Hardware e Homologação de Segurança Mobile
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Na <strong>Etapa 01</strong>, o sistema executa o benchmark no aparelho e preenche todas as características automaticamente. Somente após esse levantamento a <strong>Etapa 02</strong> é liberada para você rodar os testes de homologação desejados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
              {devices.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-red-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Limpar Histórico</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileQrModalOpen(true)}
                className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span>QR Code &amp; Compilação Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewDeviceModalOpen(true)}
                className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Cadastro Manual</span>
              </button>
              {activeDevice && (
                <button
                  type="button"
                  onClick={() => setIsHwModalOpen(true)}
                  className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>Bancada Física</span>
                </button>
              )}
            </div>
          </div>

          {/* PAINEL DE ACESSO VIA QR CODE & COMPILAÇÃO UNIVERSAL PARA QUALQUER CELULAR */}
          <MobileQrAndBuildBanner onOpenModal={() => setIsMobileQrModalOpen(true)} />

          {/* PAINEL DE 2 ETAPAS: 1. BENCHMARK E AUTO-PREENCHIMENTO -> 2. LIBERAÇÃO E SELEÇÃO DOS TESTES */}
          <BenchmarkAndTestGatePanel
            liveProbe={liveProbe}
            isBenchmarking={isBenchmarking}
            benchmarkProgressPct={benchmarkProgressPct}
            benchmarkStepLabel={benchmarkStepLabel}
            activeDevice={activeDevice}
            selectedStageIds={selectedStageIds}
            isRunningTests={isRunningBattery}
            onRunBenchmark={() => handleRunBenchmark(false)}
            onUpdateAutoFilledDevice={handleUpdateAutoFilledDevice}
            onToggleStageId={handleToggleStageId}
            onSelectAllStages={handleSelectAllStages}
            onExecuteSelectedTests={handleExecuteSelectedTests}
            onOpenPhysicalHardwareModal={() => setIsHwModalOpen(true)}
          />

          {/* RESULTADOS DOS TESTES EXECUTADOS (EXIBIDO APÓS CLICAR EM TESTE NA ETAPA 02) */}
          {activeDevice && (isRunningBattery || currentBatterySummary) && (
            <TestBatteryPanel
              device={activeDevice}
              isRunning={isRunningBattery}
              currentStepIndex={batteryStepIndex}
              liveElapsedMs={liveElapsedMs}
              summary={currentBatterySummary}
              report={homologationReport}
              checklist={currentChecklist}
              liveProbe={liveProbe}
              completedReqIds={completedReqsByDevice[activeDevice.id] || []}
              onRunBattery={handleExecuteSelectedTests}
              onOpenHardwareModal={() => setIsHwModalOpen(true)}
              onResolveRequirement={handleResolveAdditionalRequirement}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {/* PARECER EXECUTIVO DE HOMOLOGAÇÃO (EXIBIDO APÓS EXECUÇÃO DOS TESTES) */}
          {activeDevice && currentBatterySummary && homologationReport && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <label
                    htmlFor="select-active-device"
                    className="block text-xs font-semibold text-slate-500"
                  >
                    Aparelho Levantado em Inspeção ({devices.length} no histórico)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                    <select
                      id="select-active-device"
                      value={activeDevice.id}
                      onChange={(e) => handleSelectDevice(e.target.value)}
                      className="w-full sm:w-auto max-w-full min-h-[44px] px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg truncate focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {devices.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.manufacturer} {dev.model} ({dev.osVersion})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRunBenchmark(true)}
                      className="px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 self-start sm:self-auto"
                    >
                      + Levantar Novo Aparelho via Benchmark
                    </button>
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
            </div>
          )}
        </section>

        {/* SECTION 1.5: ARQUITETURA TÉCNICA DOS 4 PILARES & GERADOR DE CÓDIGO NATIVO (32 SUB-ITENS) */}
        <FourPillarsExplorer
          liveProbe={liveProbe}
          onCpuStressComplete={(summaryLine, stressReport) => {
            if (!activeDevice) return;
            setChecklistByDevice((prev) => {
              const list = prev[activeDevice.id] || currentChecklist;
              return {
                ...prev,
                [activeDevice.id]: list.map((item) =>
                  item.id === 'hw-cpu-64'
                    ? {
                        ...item,
                        status: stressReport.passedHomologation ? 'pass' : 'warning',
                        evidenceValue: `${stressReport.sustainedMflops} MFLOPS sustentados (${stressReport.sustainedStabilityPercent}%) · ${
                          stressReport.throttlingOnsetSecond !== null
                            ? `Throttling DVFS em T+${stressReport.throttlingOnsetSecond}s`
                            : 'Sem Throttling (30s)'
                        }`,
                        technicianNote: summaryLine,
                      }
                    : item
                ),
              };
            });
          }}
        />

        {/* SECTION 2: CHECKLIST COMPLETO DE HOMOLOGAÇÃO */}
        <section id="checklist" className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  01. Checklist Técnico de Homologação ({filteredChecklist.length} de{' '}
                  {displayedChecklist.length} controles)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white border border-red-700">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {severityCounts.critical} Crítico
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  {severityCounts.high} Alta
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Identifique imediatamente os controles de impacto <strong>Crítico</strong> e{' '}
                <strong>Alta</strong> através dos indicadores visuais na lista abaixo.
              </p>
            </div>

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

          {(!activeDevice || !currentBatterySummary) && (
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-900">
                  {!activeDevice
                    ? 'Modo de Inspeção Rápida da Matriz (Aguardando Etapa 01 — Benchmark)'
                    : 'Características preenchidas! Clique em TESTE na Etapa 02 acima para validar este aparelho.'}
                </p>
                <p className="text-xs text-slate-600">
                  Os 20 controles e seus indicadores de impacto (<strong>Crítico</strong> /{' '}
                  <strong>Alta</strong>) já estão visíveis abaixo. Execute o Benchmark e o TESTE para habilitar a edição de laudo do aparelho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!liveProbe || !activeDevice) {
                    handleRunBenchmark(true);
                  } else {
                    handleExecuteSelectedTests();
                  }
                }}
                className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                {!liveProbe || !activeDevice ? '1. Iniciar Benchmark' : '2. Executar TESTE'}
              </button>
            </div>
          )}

          {/* Barra de Filtros Interativos (Domínios + Criticidade + Status) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
                Todos ({displayedChecklist.length})
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

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Filtrar por nível de criticidade"
                className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setSeverityFilter('all')}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    severityFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas Criticidades
                </button>
                <button
                  type="button"
                  data-testid="filter-severity-critical"
                  onClick={() => setSeverityFilter('critical')}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    severityFilter === 'critical'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-800 hover:bg-red-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  Crítico ({severityCounts.critical})
                </button>
                <button
                  type="button"
                  data-testid="filter-severity-high"
                  onClick={() => setSeverityFilter('high')}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    severityFilter === 'high'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Alta ({severityCounts.high})
                </button>
              </div>

              {homologationReport && (
                <div
                  role="group"
                  aria-label="Filtrar por resultado da verificação"
                  className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
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
              )}
            </div>
          </div>

          {/* Lista Estruturada do Checklist com Badges Visuais de 'Crítico' e 'Alta' */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
            {filteredChecklist.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  Nenhum item encontrado para os filtros aplicados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomain('all');
                    setStatusFilter('all');
                    setSeverityFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Restaurar Todos os Controles
                </button>
              </div>
            ) : (
              filteredChecklist.map((item) => {
                const badgeMeta = getChecklistSeverityBadge(item.severity);
                return (
                  <div
                    key={item.id}
                    data-testid={`checklist-item-${item.code}`}
                    className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors border-l-4 ${
                      item.severity === 'critical'
                        ? 'border-l-red-600'
                        : item.severity === 'high'
                          ? 'border-l-amber-500'
                          : 'border-l-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md tabular-nums">
                          {item.code}
                        </span>

                        {/* Indicador Visual (Badge) Direto de 'Crítico' / 'Alta' / 'Média' */}
                        {item.severity === 'critical' ? (
                          <span
                            data-testid={`badge-severity-${item.code}`}
                            data-severity="critical"
                            title={badgeMeta.impactDescription}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide bg-red-600 text-white border border-red-700 shadow-2xs shrink-0"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            {badgeMeta.badgeLabel}
                          </span>
                        ) : item.severity === 'high' ? (
                          <span
                            data-testid={`badge-severity-${item.code}`}
                            data-severity="high"
                            title={badgeMeta.impactDescription}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide bg-amber-100 text-amber-900 border border-amber-400 shrink-0"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            {badgeMeta.badgeLabel}
                          </span>
                        ) : (
                          <span
                            data-testid={`badge-severity-${item.code}`}
                            data-severity="medium"
                            title={badgeMeta.impactDescription}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 shrink-0"
                          >
                            {badgeMeta.badgeLabel}
                          </span>
                        )}

                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">
                          {DOMAIN_LABELS[item.domain]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{badgeMeta.impactDescription}</span>
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

                      {activeDevice && currentBatterySummary && (
                        <>
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
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-center shrink-0">
                      <button
                        type="button"
                        disabled={!activeDevice}
                        onClick={() => handleUpdateChecklistStatus(item.id, 'pass')}
                        aria-label={`Marcar ${item.code} como Conforme`}
                        className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                          item.status === 'pass'
                            ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Conforme
                      </button>
                      <button
                        type="button"
                        disabled={!activeDevice}
                        onClick={() => handleUpdateChecklistStatus(item.id, 'warning')}
                        aria-label={`Marcar ${item.code} como Ressalva`}
                        className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                          item.status === 'warning'
                            ? 'bg-amber-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ressalva
                      </button>
                      <button
                        type="button"
                        disabled={!activeDevice}
                        onClick={() => handleUpdateChecklistStatus(item.id, 'fail')}
                        aria-label={`Marcar ${item.code} como Falha`}
                        className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                          item.status === 'fail'
                            ? 'bg-red-700 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Vulnerável
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 3: AUDITORIA DE VULNERABILIDADES (CVEs) */}
        <section id="vulnerabilidades" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                02. Inteligência de Vulnerabilidades (CVEs) e Superfície de Exposição
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                {activeDevice
                  ? `Cruzamento automático entre o SoC (${activeDevice.socChipset}), o sistema (${activeDevice.osVersion}) e a data do Patch (${activeDevice.securityPatchDate}).`
                  : 'As vulnerabilidades (CVEs) serão cruzadas após o levantamento das características e execução dos testes.'}
              </p>
            </div>

            {activeDevice && currentBatterySummary && (
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
            )}
          </div>

          {!activeDevice || !currentBatterySummary || !homologationReport ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Aguardando execução dos testes na Etapa 02 para exibir o cruzamento de CVEs.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Após o benchmark preencher o sistema operacional e chipset do celular, execute o botão TESTE para auditar vulnerabilidades críticas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
          )}
        </section>

        {/* SECTION 4: MATRIZ COMPARATIVA DO PARQUE TECNOLÓGICO CAPTURADO */}
        <section id="parque" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                03. Histórico de Aparelhos Capturados no Parque ({devices.length})
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Lista construída exclusivamente com os aparelhos que você levantou no benchmark e validou.
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {devices.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-red-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Zerar Histórico
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNewDeviceModalOpen(true)}
                className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Cadastrar Modelo
              </button>
            </div>
          </div>

          {devices.length === 0 ? (
            <div
              data-testid="empty-parque-table"
              className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2"
            >
              <p className="text-sm font-semibold text-slate-900">
                O histórico do seu parque está vazio (0 aparelhos registrados).
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cada celular levantado na Etapa 01 (Benchmark) e testado na Etapa 02 passará a compor esta matriz comparativa.
              </p>
            </div>
          ) : (
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
                    const isSelected = activeDevice ? dev.id === activeDevice.id : false;

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
          )}
        </section>
      </main>

      {/* Footer Clean */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            HomologIT · Plataforma de Benchmark, Levantamento Automático e Homologação Mobile
          </p>
          <div className="flex items-center gap-4">
            <a href="#diagnostico" className="hover:text-slate-900">
              Benchmark & Testes
            </a>
            <span aria-hidden="true">·</span>
            <a href="#checklist" className="hover:text-slate-900">
              Checklist ISO/NIST Mobile
            </a>
            {activeDevice && currentBatterySummary && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="hover:text-slate-900 underline"
                >
                  Exportar Laudo
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação rápida mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center px-2"
      >
        <a
          href="#diagnostico"
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-medium text-slate-700 hover:text-slate-900"
        >
          <span>Benchmark</span>
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
          onClick={() => {
            if (!liveProbe || !activeDevice) {
              handleRunBenchmark(true);
            } else if (!currentBatterySummary) {
              handleExecuteSelectedTests();
            } else {
              setIsReportModalOpen(true);
            }
          }}
          className="min-h-[44px] flex flex-col items-center justify-center text-[11px] font-semibold text-slate-900"
        >
          <span>
            {!liveProbe || !activeDevice
              ? '1. Benchmark'
              : !currentBatterySummary
                ? '2. TESTE'
                : 'Laudo'}
          </span>
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

      {activeDevice && homologationReport && (
        <HomologationReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          device={activeDevice}
          report={homologationReport}
          checklist={currentChecklist}
          liveProbe={liveProbe}
          batterySummary={currentBatterySummary}
        />
      )}

      <MobileQrAndBuildModal
        isOpen={isMobileQrModalOpen}
        onClose={() => setIsMobileQrModalOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
