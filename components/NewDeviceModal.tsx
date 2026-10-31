'use client';

import React, {useState} from 'react';
import {X, PlusCircle, Cpu} from 'lucide-react';
import {
  DeviceSpec,
  UsageProfile,
  validateCustomDeviceInput,
} from '@/lib/homologation-engine';
import {
  LiveProbeResult,
  runLiveHardwareAndSecurityProbe,
} from '@/lib/device-probe';

interface NewDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (device: DeviceSpec) => void;
  liveProbe: LiveProbeResult | null;
}

export function NewDeviceModal({
  isOpen,
  onClose,
  onAddDevice,
  liveProbe,
}: NewDeviceModalProps) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [codename, setCodename] = useState('');
  const [osFamily, setOsFamily] = useState<'Android' | 'iOS' | 'Outro'>('Android');
  const [osVersion, setOsVersion] = useState('');
  const [securityPatchDate, setSecurityPatchDate] = useState('');
  const [socChipset, setSocChipset] = useState('');
  const [ramGb, setRamGb] = useState<number>(8);
  const [storageGb, setStorageGb] = useState<number>(128);
  const [hardwareKeystore, setHardwareKeystore] = useState<
    'StrongBox / Secure Enclave' | 'TEE Padrão' | 'Software-only'
  >('StrongBox / Secure Enclave');
  const [biometricClass, setBiometricClass] = useState<
    'Classe 3 (3D / Ultrassônico)' | 'Classe 2 (Óptico / 2D)' | 'Básico / Ausente'
  >('Classe 3 (3D / Ultrassônico)');
  const [mdmSupport, setMdmSupport] = useState<
    'Total (Zero-Touch / Knox / ABM)' | 'Perfil de Trabalho Padrão' | 'Limitado'
  >('Total (Zero-Touch / Knox / ABM)');
  const [eolDate, setEolDate] = useState('');
  const [wifiStandard, setWifiStandard] = useState<
    'WPA3-Enterprise (Wi-Fi 6E/7)' | 'WPA3-Personal / WPA2-Enterprise' | 'Apenas WPA2'
  >('WPA3-Enterprise (Wi-Fi 6E/7)');
  const [bootloaderLocked, setBootloaderLocked] = useState(true);
  const [usageProfile, setUsageProfile] = useState<UsageProfile>('cope_corporate');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isOpen) return null;

  const handlePrefillFromLiveProbe = async () => {
    setIsCapturing(true);
    const probe = liveProbe || (await runLiveHardwareAndSecurityProbe());
    setIsCapturing(false);

    const isIos = probe.detectedPlatform.toLowerCase().includes('ios');
    const todayStr = new Date().toISOString().slice(0, 10);
    setManufacturer(isIos ? 'Apple' : 'OEM Capturado');
    setModel(`Aparelho Validado (${probe.screenResolution})`);
    setCodename(`HW-${probe.cpuCores}C-${probe.estimatedRamGb}G`);
    setOsFamily(isIos ? 'iOS' : 'Android');
    setOsVersion(probe.detectedPlatform);
    setSecurityPatchDate(todayStr);
    setEolDate('2029-10-30');
    setSocChipset(probe.gpuRenderer.slice(0, 48));
    setRamGb(probe.estimatedRamGb);
    setStorageGb(
      probe.storageQuotaGb && probe.storageQuotaGb >= 32 ? probe.storageQuotaGb : 128
    );
    setHardwareKeystore(
      probe.webAuthnPlatformAvailable ? 'StrongBox / Secure Enclave' : 'TEE Padrão'
    );
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCustomDeviceInput({
      manufacturer,
      model,
      osVersion,
      securityPatchDate,
      socChipset,
      ramGb,
      storageGb,
      eolDate,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const newDevice: DeviceSpec = {
      id: `custom-${Date.now()}`,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      codename: codename.trim() || 'CANDIDATO-TI',
      osFamily,
      osVersion: osVersion.trim(),
      securityPatchDate,
      socChipset: socChipset.trim(),
      ramGb,
      storageGb,
      hardwareKeystore,
      biometricClass,
      mdmSupport,
      eolDate,
      wifiStandard,
      bootloaderLocked,
      usageProfile,
      testedAt: new Date().toISOString().slice(0, 10),
    };

    onAddDevice(newDevice);
    setManufacturer('');
    setModel('');
    setCodename('');
    setOsVersion('');
    setSecurityPatchDate('');
    setSocChipset('');
    setEolDate('');
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-device-modal-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Entrada de Equipamento · Triagem Técnica de Parque
            </p>
            <h2 id="new-device-modal-title" className="text-xl font-bold text-slate-900 mt-1">
              Cadastrar Novo Aparelho para Homologação
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cadastro de aparelho"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Captura Automática de Hardware:
            </span>{' '}
            Preencha os campos lendo diretamente os sensores e GPU/CPU do dispositivo atual.
          </div>
          <button
            type="button"
            onClick={handlePrefillFromLiveProbe}
            disabled={isCapturing}
            className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {isCapturing ? 'Capturando...' : 'Preencher com Dados deste Aparelho'}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dev-manufacturer" className="block text-xs font-semibold text-slate-700 mb-1">
                Fabricante *
              </label>
              <input
                id="dev-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Ex: Samsung, Apple, Motorola"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.manufacturer && (
                <p className="text-xs text-red-600 mt-1">{errors.manufacturer}</p>
              )}
            </div>

            <div>
              <label htmlFor="dev-model" className="block text-xs font-semibold text-slate-700 mb-1">
                Modelo Comercial *
              </label>
              <input
                id="dev-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Galaxy A55 5G Enterprise"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model}</p>}
            </div>

            <div>
              <label htmlFor="dev-os-family" className="block text-xs font-semibold text-slate-700 mb-1">
                Família do Sistema Operacional
              </label>
              <select
                id="dev-os-family"
                value={osFamily}
                onChange={(e) => setOsFamily(e.target.value as 'Android' | 'iOS' | 'Outro')}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Android">Android</option>
                <option value="iOS">Apple iOS</option>
                <option value="Outro">Outro (HarmonyOS / Custom)</option>
              </select>
            </div>

            <div>
              <label htmlFor="dev-os-version" className="block text-xs font-semibold text-slate-700 mb-1">
                Versão do Sistema / Build *
              </label>
              <input
                id="dev-os-version"
                type="text"
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                placeholder="Ex: Android 15 (One UI 7)"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.osVersion && <p className="text-xs text-red-600 mt-1">{errors.osVersion}</p>}
            </div>

            <div>
              <label htmlFor="dev-soc" className="block text-xs font-semibold text-slate-700 mb-1">
                Processador / SoC *
              </label>
              <input
                id="dev-soc"
                type="text"
                value={socChipset}
                onChange={(e) => setSocChipset(e.target.value)}
                placeholder="Ex: Snapdragon 7 Gen 3 / Exynos 1480"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.socChipset && <p className="text-xs text-red-600 mt-1">{errors.socChipset}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dev-ram" className="block text-xs font-semibold text-slate-700 mb-1">
                  RAM (GB) *
                </label>
                <input
                  id="dev-ram"
                  type="number"
                  value={ramGb}
                  onChange={(e) => setRamGb(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {errors.ramGb && <p className="text-xs text-red-600 mt-1">{errors.ramGb}</p>}
              </div>
              <div>
                <label htmlFor="dev-storage" className="block text-xs font-semibold text-slate-700 mb-1">
                  Flash (GB) *
                </label>
                <input
                  id="dev-storage"
                  type="number"
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {errors.storageGb && <p className="text-xs text-red-600 mt-1">{errors.storageGb}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="dev-patch-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Nível de Patch de Segurança *
              </label>
              <input
                id="dev-patch-date"
                type="date"
                value={securityPatchDate}
                onChange={(e) => setSecurityPatchDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.securityPatchDate && (
                <p className="text-xs text-red-600 mt-1">{errors.securityPatchDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="dev-eol-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Fim de Suporte Oficial (EoL) *
              </label>
              <input
                id="dev-eol-date"
                type="date"
                value={eolDate}
                onChange={(e) => setEolDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.eolDate && <p className="text-xs text-red-600 mt-1">{errors.eolDate}</p>}
            </div>

            <div>
              <label htmlFor="dev-keystore" className="block text-xs font-semibold text-slate-700 mb-1">
                Módulo Criptográfico (Keystore)
              </label>
              <select
                id="dev-keystore"
                value={hardwareKeystore}
                onChange={(e) =>
                  setHardwareKeystore(
                    e.target.value as 'StrongBox / Secure Enclave' | 'TEE Padrão' | 'Software-only'
                  )
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="StrongBox / Secure Enclave">StrongBox / Secure Enclave</option>
                <option value="TEE Padrão">TEE Padrão (TrustZone)</option>
                <option value="Software-only">Apenas Software (Inseguro)</option>
              </select>
            </div>

            <div>
              <label htmlFor="dev-mdm" className="block text-xs font-semibold text-slate-700 mb-1">
                Suporte a Provisionamento MDM
              </label>
              <select
                id="dev-mdm"
                value={mdmSupport}
                onChange={(e) =>
                  setMdmSupport(
                    e.target.value as
                      | 'Total (Zero-Touch / Knox / ABM)'
                      | 'Perfil de Trabalho Padrão'
                      | 'Limitado'
                  )
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Total (Zero-Touch / Knox / ABM)">
                  Total (Zero-Touch / Knox / ABM)
                </option>
                <option value="Perfil de Trabalho Padrão">Perfil de Trabalho Padrão</option>
                <option value="Limitado">Limitado (ROM sem suporte Enterprise)</option>
              </select>
            </div>

            <div>
              <label htmlFor="dev-profile" className="block text-xs font-semibold text-slate-700 mb-1">
                Perfil de Uso Alvo na Empresa
              </label>
              <select
                id="dev-profile"
                value={usageProfile}
                onChange={(e) => setUsageProfile(e.target.value as UsageProfile)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="cope_corporate">Frota Corporativa (COPE)</option>
                <option value="byod_restricted">Uso Pessoal Homologado (BYOD)</option>
                <option value="vip_critical">Alta Segurança / Executivo (VIP)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={bootloaderLocked}
                  onChange={(e) => setBootloaderLocked(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Bootloader Bloqueado (Verified Boot Intacto)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Iniciar Homologação deste Modelo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
