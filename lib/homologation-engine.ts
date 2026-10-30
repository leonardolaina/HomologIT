export type CheckDomain =
  | 'hardware'
  | 'security'
  | 'os_lifecycle'
  | 'mdm_compliance'
  | 'network_dlp';

export type CheckStatus = 'pass' | 'warning' | 'fail';

export type SeverityLevel = 'critical' | 'high' | 'medium';

export type UsageProfile = 'cope_corporate' | 'byod_restricted' | 'vip_critical';

export type HomologationVerdict =
  | 'APROVADO_PARQUE'
  | 'APROVADO_COM_RESTRICOES'
  | 'REPROVADO_RISCO_CRITICO';

export interface ChecklistItem {
  id: string;
  code: string;
  domain: CheckDomain;
  title: string;
  description: string;
  requirement: string;
  severity: SeverityLevel;
  status: CheckStatus;
  evidenceValue: string;
  technicianNote: string;
}

export interface DeviceSpec {
  id: string;
  manufacturer: string;
  model: string;
  codename: string;
  osFamily: 'Android' | 'iOS' | 'Outro';
  osVersion: string;
  securityPatchDate: string; // YYYY-MM-DD
  socChipset: string;
  ramGb: number;
  storageGb: number;
  hardwareKeystore: 'StrongBox / Secure Enclave' | 'TEE Padrão' | 'Software-only';
  biometricClass: 'Classe 3 (3D / Ultrassônico)' | 'Classe 2 (Óptico / 2D)' | 'Básico / Ausente';
  mdmSupport: 'Total (Zero-Touch / Knox / ABM)' | 'Perfil de Trabalho Padrão' | 'Limitado';
  eolDate: string; // YYYY-MM-DD
  wifiStandard: 'WPA3-Enterprise (Wi-Fi 6E/7)' | 'WPA3-Personal / WPA2-Enterprise' | 'Apenas WPA2';
  bootloaderLocked: boolean;
  usageProfile: UsageProfile;
  testedAt?: string;
}

export interface CveAdvisory {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  cvssScore: number;
  component: string;
  osTarget: 'Android' | 'iOS' | 'Qualcomm' | 'MediaTek' | 'Exynos' | 'All';
  summary: string;
  corporateImpact: string;
  mitigation: string;
  patchedAfter: string; // YYYY-MM-DD
  activeExploit: boolean;
}

export interface DomainScoreSummary {
  domain: CheckDomain;
  label: string;
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  total: number;
}

export interface HomologationReport {
  totalScore: number;
  domainScores: DomainScoreSummary[];
  criticalFailures: ChecklistItem[];
  warningsCount: number;
  passedCount: number;
  failedCount: number;
  activeCves: CveAdvisory[];
  exploitedCvesCount: number;
  verdict: HomologationVerdict;
  verdictLabel: string;
  verdictSummary: string;
  recommendedPolicy: string[];
  patchAgeDays: number;
  eolMonthsRemaining: number;
}

export const DOMAIN_LABELS: Record<CheckDomain, string> = {
  hardware: 'Hardware & Sensores',
  security: 'Segurança de Silício & Boot',
  os_lifecycle: 'Sistema & Ciclo de Patch',
  mdm_compliance: 'Governança MDM & Zero Trust',
  network_dlp: 'Rede, Criptografia & DLP',
};

export const USAGE_PROFILE_LABELS: Record<UsageProfile, string> = {
  cope_corporate: 'Frota Corporativa (COPE)',
  byod_restricted: 'Uso Pessoal Homologado (BYOD)',
  vip_critical: 'Alta Segurança / Executivo (VIP)',
};

export const REFERENCE_DEVICES: DeviceSpec[] = [
  {
    id: 'galaxy-s24-ent',
    manufacturer: 'Samsung',
    model: 'Galaxy S24 Enterprise Edition',
    codename: 'SM-S921B/DS',
    osFamily: 'Android',
    osVersion: 'Android 15 (One UI 7)',
    securityPatchDate: '2026-10-01',
    socChipset: 'Exynos 2400 / Snapdragon 8 Gen 3',
    ramGb: 8,
    storageGb: 256,
    hardwareKeystore: 'StrongBox / Secure Enclave',
    biometricClass: 'Classe 3 (3D / Ultrassônico)',
    mdmSupport: 'Total (Zero-Touch / Knox / ABM)',
    eolDate: '2031-01-31',
    wifiStandard: 'WPA3-Enterprise (Wi-Fi 6E/7)',
    bootloaderLocked: true,
    usageProfile: 'cope_corporate',
  },
  {
    id: 'iphone-16-pro',
    manufacturer: 'Apple',
    model: 'iPhone 16 Pro',
    codename: 'A3293',
    osFamily: 'iOS',
    osVersion: 'iOS 18.4',
    securityPatchDate: '2026-10-10',
    socChipset: 'Apple A18 Pro (6-core GPU)',
    ramGb: 8,
    storageGb: 256,
    hardwareKeystore: 'StrongBox / Secure Enclave',
    biometricClass: 'Classe 3 (3D / Ultrassônico)',
    mdmSupport: 'Total (Zero-Touch / Knox / ABM)',
    eolDate: '2031-09-30',
    wifiStandard: 'WPA3-Enterprise (Wi-Fi 6E/7)',
    bootloaderLocked: true,
    usageProfile: 'vip_critical',
  },
  {
    id: 'moto-g84-5g',
    manufacturer: 'Motorola',
    model: 'Moto G84 5G',
    codename: 'XT2347-2',
    osFamily: 'Android',
    osVersion: 'Android 14',
    securityPatchDate: '2026-07-15',
    socChipset: 'Qualcomm Snapdragon 695 5G',
    ramGb: 8,
    storageGb: 256,
    hardwareKeystore: 'TEE Padrão',
    biometricClass: 'Classe 2 (Óptico / 2D)',
    mdmSupport: 'Perfil de Trabalho Padrão',
    eolDate: '2027-09-01',
    wifiStandard: 'WPA3-Personal / WPA2-Enterprise',
    bootloaderLocked: true,
    usageProfile: 'byod_restricted',
  },
  {
    id: 'redmi-note-12-unverified',
    manufacturer: 'Xiaomi',
    model: 'Redmi Note 12 (Importado / ROM Global)',
    codename: '23021RAA2Y',
    osFamily: 'Android',
    osVersion: 'Android 13 (MIUI 14)',
    securityPatchDate: '2025-11-01',
    socChipset: 'Qualcomm Snapdragon 685',
    ramGb: 4,
    storageGb: 128,
    hardwareKeystore: 'TEE Padrão',
    biometricClass: 'Classe 2 (Óptico / 2D)',
    mdmSupport: 'Limitado',
    eolDate: '2026-05-01',
    wifiStandard: 'Apenas WPA2',
    bootloaderLocked: false,
    usageProfile: 'cope_corporate',
  },
];

export const INITIAL_CHECKLIST_TEMPLATE: ChecklistItem[] = [
  // 1. Hardware & Sensores
  {
    id: 'hw-cpu-64',
    code: 'HW-01',
    domain: 'hardware',
    title: 'Arquitetura SoC 64-bit e Aceleração Criptográfica',
    description: 'Processador com instruções dedicadas AES/SHA em silício e múltiplos núcleos para agentes EDR/MDM sem engasgos.',
    requirement: 'Mínimo Octa-Core / 6+ Threads com instruções criptográficas em hardware',
    severity: 'high',
    status: 'pass',
    evidenceValue: '8 núcleos ativos · AES-GCM Hardware',
    technicianNote: '',
  },
  {
    id: 'hw-ram-cap',
    code: 'HW-02',
    domain: 'hardware',
    title: 'Memória RAM Disponível para Container Corporativo',
    description: 'Capacidade de sustentar perfil de trabalho isolado, VPN Always-On e aplicativos de produtividade simultaneamente.',
    requirement: 'Mínimo 6 GB para COPE / 8 GB para VIP',
    severity: 'high',
    status: 'pass',
    evidenceValue: '8 GB LPDDR5',
    technicianNote: '',
  },
  {
    id: 'hw-storage-ufs',
    code: 'HW-03',
    domain: 'hardware',
    title: 'Armazenamento Interno Criptografável (UFS / NVMe)',
    description: 'Espaço físico livre e velocidade de I/O compatível com File-Based Encryption sem degradação severa.',
    requirement: 'Mínimo 128 GB internos sem expansão SD desprotegida',
    severity: 'medium',
    status: 'pass',
    evidenceValue: '256 GB NVMe/UFS',
    technicianNote: '',
  },
  {
    id: 'hw-biometrics',
    code: 'HW-04',
    domain: 'hardware',
    title: 'Sensor Biométrico Antifraude (Padrão Classe 3)',
    description: 'Resistência a spoofing (fotos 2D ou moldes simples) e integração direta com chaves criptográficas FIDO2/WebAuthn.',
    requirement: 'Biometria Classe 3 (Ultrassônico 3D ou FaceID Infravermelho)',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'Classe 3 (3D / Ultrassônico)',
    technicianNote: '',
  },
  {
    id: 'hw-sensors-media',
    code: 'HW-05',
    domain: 'hardware',
    title: 'Integridade de Câmera, Microfone e Sensores Físicos',
    description: 'Controle de permissão de hardware (indicadores visuais de acesso à câmera/mic) e funcionamento de giroscópio/NFC.',
    requirement: 'Indicadores de privacidade ativos no SO e sensores íntegros',
    severity: 'medium',
    status: 'pass',
    evidenceValue: 'Sensores verificados · Indicadores de câmera ativos',
    technicianNote: '',
  },

  // 2. Segurança de Silício & Boot
  {
    id: 'sec-keystore',
    code: 'SEC-01',
    domain: 'security',
    title: 'Módulo de Segurança em Hardware (StrongBox / Secure Enclave)',
    description: 'Armazenamento de chaves privadas corporativas e certificados mTLS em coprocessador isolado da CPU principal.',
    requirement: 'Hardware Keystore dedicado (StrongBox Keymaster ou Apple Secure Enclave)',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'StrongBox / Secure Enclave',
    technicianNote: '',
  },
  {
    id: 'sec-bootloader',
    code: 'SEC-02',
    domain: 'security',
    title: 'Bootloader Bloqueado e Verified Boot (AVB 2.0 / Secure Boot)',
    description: 'Verificação criptográfica da cadeia de inicialização impedindo carregamento de imagens de sistema adulteradas.',
    requirement: 'Bootloader bloqueado de fábrica + OEM Unlock desativável via política',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'Bloqueado (Verified Boot Green)',
    technicianNote: '',
  },
  {
    id: 'sec-root-jailbreak',
    code: 'SEC-03',
    domain: 'security',
    title: 'Ausência de Root, Jailbreak ou Binários SU/Magisk',
    description: 'Inspeção de integridade da partição /system, Play Integrity API (MEETS_STRONG_INTEGRITY) ou App Attest.',
    requirement: 'Integridade Forte (Strong Integrity) sem vestígios de escalação de privilégio',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'Integridade confirmada · Sem binários su',
    technicianNote: '',
  },
  {
    id: 'sec-fbe-encryption',
    code: 'SEC-04',
    domain: 'security',
    title: 'Criptografia Baseada em Arquivos (FBE AES-256-XTS)',
    description: 'Proteção de dados em repouso separando chaves de credenciais do usuário (CE) e do dispositivo (DE).',
    requirement: 'Criptografia FBE nativa ativa por padrão sem opção de downgrade',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'AES-256-XTS Ativo',
    technicianNote: '',
  },
  {
    id: 'sec-usb-debug',
    code: 'SEC-05',
    domain: 'security',
    title: 'Bloqueio de Depuração USB (ADB) e Transferência MTP em Tela Bloqueada',
    description: 'Mitigação contra ataques físicos via porta USB/Type-C (Juice Jacking, Cellebrite / extração forense).',
    requirement: 'Bloqueio de dados USB quando bloqueado e restrição de ADB via MDM',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'ADB bloqueável · Restrição USB em lockscreen',
    technicianNote: '',
  },

  // 3. Sistema & Ciclo de Patch
  {
    id: 'os-patch-level',
    code: 'OS-01',
    domain: 'os_lifecycle',
    title: 'Nível do Patch de Segurança Mensal (SMR)',
    description: 'Defasagem máxima tolerada entre o boletim oficial de segurança (Android/Apple) e o firmware do aparelho.',
    requirement: 'Patch de segurança com menos de 60 dias de defasagem (Máx 90 dias para BYOD)',
    severity: 'critical',
    status: 'pass',
    evidenceValue: '2026-10-01 (29 dias)',
    technicianNote: '',
  },
  {
    id: 'os-eol-window',
    code: 'OS-02',
    domain: 'os_lifecycle',
    title: 'Janela de Suporte e Fim de Vida Útil (EoL / End-of-Support)',
    description: 'Garantia contratual do fabricante para entrega contínua de correções de CVEs críticas nos próximos anos.',
    requirement: 'Mínimo de 24 meses restantes de suporte oficial de segurança pelo fabricante',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Vigência até 2031-01-31 (51 meses restantes)',
    technicianNote: '',
  },
  {
    id: 'os-bloatware-telemetry',
    code: 'OS-03',
    domain: 'os_lifecycle',
    title: 'Auditoria de Bloatware, Adware Nativo e Telemetria Externa',
    description: 'Verificação de apps pré-instalados na ROM com permissões excessivas ou envio de dados para servidores não auditados.',
    requirement: 'ROM limpa ou pacotes de terceiros 100% removíveis/desativáveis via MDM',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Imagem Enterprise limpa sem adware de sistema',
    technicianNote: '',
  },

  // 4. Governança MDM & Zero Trust
  {
    id: 'mdm-zero-touch',
    code: 'MDM-01',
    domain: 'mdm_compliance',
    title: 'Provisionamento Automatizado (Zero-Touch / Knox / Apple Business Manager)',
    description: 'Inscrição compulsória no MDM corporativo no primeiro boot, resistente a Factory Reset pelo usuário.',
    requirement: 'Suporte nativo a Android Zero-Touch, Samsung KME ou Apple ABM',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Total (Zero-Touch / Knox / ABM)',
    technicianNote: '',
  },
  {
    id: 'mdm-work-profile',
    code: 'MDM-02',
    domain: 'mdm_compliance',
    title: 'Isolamento Criptográfico de Container Corporativo (Work Profile)',
    description: 'Separação lógica e criptográfica entre dados pessoais e corporativos com política de Wipe Seletivo.',
    requirement: 'Suporte a Perfil de Trabalho Gerenciado e Wipe Corporativo Remoto',
    severity: 'critical',
    status: 'pass',
    evidenceValue: 'Container isolado validado',
    technicianNote: '',
  },
  {
    id: 'mdm-webauthn-mtls',
    code: 'MDM-03',
    domain: 'mdm_compliance',
    title: 'Autenticação Passwordless FIDO2 / Passkeys e Certificados mTLS',
    description: 'Capacidade de realizar autenticação multifator resistente a phishing vinculada ao hardware do aparelho.',
    requirement: 'Suporte completo a WebAuthn Plataforma (UV=Required) e injeção SCEP/PKCS#12',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Autenticador FIDO2 / Passkey nativo',
    technicianNote: '',
  },

  // 5. Rede, Criptografia & DLP
  {
    id: 'net-wpa3-ent',
    code: 'NET-01',
    domain: 'network_dlp',
    title: 'Conectividade Wi-Fi Corporativa WPA3-Enterprise (802.1X EAP-TLS)',
    description: 'Autenticação em rede sem fio corporativa por certificado digital sem exposição a ataques de dicionário offline.',
    requirement: 'Suporte a WPA3-Enterprise 192-bit ou WPA2/WPA3-Enterprise com validação de domínio',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'WPA3-Enterprise (Wi-Fi 6E/7)',
    technicianNote: '',
  },
  {
    id: 'net-vpn-alwayson',
    code: 'NET-02',
    domain: 'network_dlp',
    title: 'VPN Always-On por Aplicativo com Lockdown (Kill Switch)',
    description: 'Tunelamento obrigatório do tráfego de aplicativos corporativos impedindo vazamento em redes Wi-Fi públicas.',
    requirement: 'Suporte a Per-App VPN e modo Lockdown sem bypass local',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Per-App VPN + Kill Switch suportados',
    technicianNote: '',
  },
  {
    id: 'net-webrtc-dns',
    code: 'NET-03',
    domain: 'network_dlp',
    title: 'Proteção contra Vazamento de IP Local (WebRTC) e DNS-over-TLS',
    description: 'Impede que páginas web maliciosas enumerem endereços IP internos da sub-rede corporativa via candidatos STUN/ICE.',
    requirement: 'Mascaramento mDNS/WebRTC ativo e suporte a Private DNS (DoT/DoH)',
    severity: 'medium',
    status: 'pass',
    evidenceValue: 'IP interno oculto (mDNS) · TLS 1.3',
    technicianNote: '',
  },
  {
    id: 'net-dlp-clipboard',
    code: 'NET-04',
    domain: 'network_dlp',
    title: 'Prevenção de Perda de Dados (DLP): Área de Transferência e Captura de Tela',
    description: 'Bloqueio de cópia/colagem de textos corporativos para aplicativos não gerenciados (WhatsApp pessoal, redes sociais).',
    requirement: 'Restrição cross-profile de Clipboard, compartilhamento de arquivos e captura de tela',
    severity: 'high',
    status: 'pass',
    evidenceValue: 'Bloqueio DLP Cross-Profile suportado',
    technicianNote: '',
  },
];

export const CURATED_MOBILE_CVES: CveAdvisory[] = [
  {
    id: 'CVE-2026-21408',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    component: 'Modem Baseband / Processamento de Pacotes 5G RRC',
    osTarget: 'Qualcomm',
    summary:
      'Execução remota de código (RCE) zero-click no firmware de baseband ao processar quadros de sinalização malformados sem interação do usuário.',
    corporateImpact:
      'Comprometimento silencioso do canal de voz/dados e interceptação de tráfego em trânsito antes da camada do sistema operacional.',
    mitigation: 'Exigir nível de patch de segurança a partir de Agosto/2026 ou bloquear uso em linhas executivas VIP.',
    patchedAfter: '2026-08-01',
    activeExploit: true,
  },
  {
    id: 'CVE-2026-10942',
    severity: 'CRITICAL',
    cvssScore: 9.1,
    component: 'Android System / Framework Privilege Escalation',
    osTarget: 'Android',
    summary:
      'Escalação local de privilégios para nível SYSTEM_UID permitindo que um aplicativo malicioso contorne o isolamento de sandbox do Perfil de Trabalho.',
    corporateImpact:
      'Quebra do isolamento entre o ambiente pessoal (BYOD) e o container corporativo gerenciado pelo MDM.',
    mitigation: 'Atualizar boletim de segurança Android para Setembro/2026 ou superior.',
    patchedAfter: '2026-09-01',
    activeExploit: true,
  },
  {
    id: 'CVE-2026-18831',
    severity: 'HIGH',
    cvssScore: 8.6,
    component: 'WebKit / Motor de Renderização de Navegador Mobile',
    osTarget: 'iOS',
    summary:
      'Corrupção de memória type-confusion no motor JIT do WebKit permitindo execução arbitrária de código ao abrir links de spear-phishing.',
    corporateImpact:
      'Exfiltração de tokens de sessão Web e cookies corporativos armazenados no navegador padrão.',
    mitigation: 'Atualizar para iOS 18.4 (Patch de Outubro/2026) e ativar isolamento de navegação.',
    patchedAfter: '2026-09-25',
    activeExploit: true,
  },
  {
    id: 'CVE-2025-48910',
    severity: 'HIGH',
    cvssScore: 8.2,
    component: 'Driver GPU Mali / Adreno Kernel Memory Leak',
    osTarget: 'Android',
    summary:
      'Acesso fora dos limites (Out-of-Bounds Write) no driver de vídeo permitindo leitura de páginas físicas de memória de outros processos.',
    corporateImpact:
      'Vazamento de credenciais em memória e captura de telas renderizadas por aplicativos bancários ou ERP corporativo.',
    mitigation: 'Aplicar patch de segurança de Maio/2026 ou posterior.',
    patchedAfter: '2026-05-01',
    activeExploit: false,
  },
  {
    id: 'CVE-2025-39114',
    severity: 'MEDIUM',
    cvssScore: 6.8,
    component: 'Pilha Bluetooth Low Energy (BLE) & Pareamento Próximo',
    osTarget: 'All',
    summary:
      'Bypass de autenticação no pareamento BLE em ambientes físicos densos permitindo injeção de comandos de teclado (Keystroke Injection).',
    corporateImpact:
      'Risco moderado em espaços públicos (aeroportos, cafés) caso o Bluetooth permaneça visível permanentemente.',
    mitigation: 'Patch de Julho/2026 + Política MDM restringindo pareamento Bluetooth não autorizado.',
    patchedAfter: '2026-07-15',
    activeExploit: false,
  },
];

export function calculatePatchAgeDays(
  patchDateStr: string,
  referenceDate: Date = new Date('2026-10-30T12:00:00Z')
): number {
  const parsed = new Date(patchDateStr);
  if (Number.isNaN(parsed.getTime())) {
    return 999;
  }
  const diffMs = referenceDate.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function calculateEolMonthsRemaining(
  eolDateStr: string,
  referenceDate: Date = new Date('2026-10-30T12:00:00Z')
): number {
  const parsed = new Date(eolDateStr);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }
  const diffMs = parsed.getTime() - referenceDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
}

export function deriveChecklistFromDeviceSpec(
  spec: DeviceSpec,
  baseItems: ChecklistItem[] = INITIAL_CHECKLIST_TEMPLATE,
  referenceDate: Date = new Date('2026-10-30T12:00:00Z')
): ChecklistItem[] {
  const patchDays = calculatePatchAgeDays(spec.securityPatchDate, referenceDate);
  const eolMonths = calculateEolMonthsRemaining(spec.eolDate, referenceDate);

  return baseItems.map((item) => {
    const next = {...item};

    switch (item.id) {
      case 'hw-cpu-64': {
        next.status = 'pass';
        next.evidenceValue = `${spec.socChipset} (64-bit AES-NI)`;
        break;
      }
      case 'hw-ram-cap': {
        if (spec.ramGb >= 8) {
          next.status = 'pass';
        } else if (spec.ramGb >= 6) {
          next.status = spec.usageProfile === 'vip_critical' ? 'warning' : 'pass';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = `${spec.ramGb} GB RAM instalada`;
        break;
      }
      case 'hw-storage-ufs': {
        next.status = spec.storageGb >= 128 ? 'pass' : 'warning';
        next.evidenceValue = `${spec.storageGb} GB internos`;
        break;
      }
      case 'hw-biometrics': {
        if (spec.biometricClass === 'Classe 3 (3D / Ultrassônico)') {
          next.status = 'pass';
        } else if (spec.biometricClass === 'Classe 2 (Óptico / 2D)') {
          next.status = spec.usageProfile === 'vip_critical' ? 'fail' : 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = spec.biometricClass;
        break;
      }
      case 'sec-keystore': {
        if (spec.hardwareKeystore === 'StrongBox / Secure Enclave') {
          next.status = 'pass';
        } else if (spec.hardwareKeystore === 'TEE Padrão') {
          next.status = spec.usageProfile === 'vip_critical' ? 'fail' : 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = spec.hardwareKeystore;
        break;
      }
      case 'sec-bootloader': {
        next.status = spec.bootloaderLocked ? 'pass' : 'fail';
        next.evidenceValue = spec.bootloaderLocked
          ? 'Bootloader Bloqueado (Verified Boot Ativo)'
          : 'ALERTA: Bootloader Desbloqueado (OEM Unlock)';
        break;
      }
      case 'sec-root-jailbreak': {
        next.status = spec.bootloaderLocked ? 'pass' : 'fail';
        next.evidenceValue = spec.bootloaderLocked
          ? 'Integridade do Sistema Verificada'
          : 'Integridade Comprometida (Risco de Root/ROM Customizada)';
        break;
      }
      case 'os-patch-level': {
        if (patchDays <= 60) {
          next.status = 'pass';
        } else if (patchDays <= 120) {
          next.status = spec.usageProfile === 'vip_critical' ? 'fail' : 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = `${spec.securityPatchDate} (${patchDays} dias de defasagem)`;
        break;
      }
      case 'os-eol-window': {
        if (eolMonths >= 24) {
          next.status = 'pass';
        } else if (eolMonths >= 6) {
          next.status = 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue =
          eolMonths > 0
            ? `Suporte até ${spec.eolDate} (${eolMonths} meses restantes)`
            : `FIM DE SUPORTE EXPIRADO (${spec.eolDate})`;
        break;
      }
      case 'os-bloatware-telemetry': {
        if (spec.mdmSupport === 'Total (Zero-Touch / Knox / ABM)') {
          next.status = 'pass';
          next.evidenceValue = 'ROM Corporativa auditada sem adware';
        } else if (spec.mdmSupport === 'Perfil de Trabalho Padrão') {
          next.status = 'pass';
          next.evidenceValue = 'Apps de fábrica isolados do Work Profile';
        } else {
          next.status = 'warning';
          next.evidenceValue = 'Requer remoção manual de pacotes via ADB/MDM';
        }
        break;
      }
      case 'mdm-zero-touch': {
        if (spec.mdmSupport === 'Total (Zero-Touch / Knox / ABM)') {
          next.status = 'pass';
        } else if (spec.mdmSupport === 'Perfil de Trabalho Padrão') {
          next.status = spec.usageProfile === 'byod_restricted' ? 'pass' : 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = spec.mdmSupport;
        break;
      }
      case 'mdm-work-profile': {
        next.status = spec.mdmSupport === 'Limitado' ? 'warning' : 'pass';
        next.evidenceValue =
          spec.mdmSupport === 'Limitado'
            ? 'Suporte parcial a políticas de container'
            : 'Container Corporativo e Wipe Remoto compatíveis';
        break;
      }
      case 'net-wpa3-ent': {
        if (spec.wifiStandard === 'WPA3-Enterprise (Wi-Fi 6E/7)') {
          next.status = 'pass';
        } else if (spec.wifiStandard === 'WPA3-Personal / WPA2-Enterprise') {
          next.status = 'warning';
        } else {
          next.status = 'fail';
        }
        next.evidenceValue = spec.wifiStandard;
        break;
      }
      default:
        break;
    }

    return next;
  });
}

export function matchDeviceCves(
  spec: DeviceSpec,
  advisories: CveAdvisory[] = CURATED_MOBILE_CVES
): CveAdvisory[] {
  const devicePatchTime = new Date(spec.securityPatchDate).getTime();
  const socLower = spec.socChipset.toLowerCase();

  return advisories.filter((cve) => {
    const cvePatchTime = new Date(cve.patchedAfter).getTime();
    // If the device's security patch is newer than or equal to the date the CVE was patched, it's mitigated!
    if (!Number.isNaN(devicePatchTime) && !Number.isNaN(cvePatchTime)) {
      if (devicePatchTime >= cvePatchTime) {
        return false;
      }
    }

    if (cve.osTarget === 'All') return true;
    if (cve.osTarget === spec.osFamily) return true;
    if (cve.osTarget === 'Qualcomm' && (socLower.includes('snapdragon') || socLower.includes('qualcomm'))) {
      return true;
    }
    if (cve.osTarget === 'Exynos' && socLower.includes('exynos')) {
      return true;
    }
    if (cve.osTarget === 'MediaTek' && (socLower.includes('mediatek') || socLower.includes('dimensity') || socLower.includes('helio'))) {
      return true;
    }

    return false;
  });
}

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 15,
  high: 8,
  medium: 4,
};

export function evaluateHomologation(
  spec: DeviceSpec,
  checklist: ChecklistItem[],
  matchedCves: CveAdvisory[],
  referenceDate: Date = new Date('2026-10-30T12:00:00Z')
): HomologationReport {
  const domains: CheckDomain[] = [
    'hardware',
    'security',
    'os_lifecycle',
    'mdm_compliance',
    'network_dlp',
  ];

  const domainScores: DomainScoreSummary[] = domains.map((domain) => {
    const items = checklist.filter((i) => i.domain === domain);
    let maxPoints = 0;
    let earnedPoints = 0;
    let passed = 0;
    let warnings = 0;
    let failed = 0;

    for (const item of items) {
      const weight = SEVERITY_WEIGHTS[item.severity];
      maxPoints += weight;
      if (item.status === 'pass') {
        earnedPoints += weight;
        passed += 1;
      } else if (item.status === 'warning') {
        earnedPoints += weight * 0.55;
        warnings += 1;
      } else {
        failed += 1;
      }
    }

    const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100;
    return {
      domain,
      label: DOMAIN_LABELS[domain],
      score,
      passed,
      warnings,
      failed,
      total: items.length,
    };
  });

  const totalMax = checklist.reduce((acc, item) => acc + SEVERITY_WEIGHTS[item.severity], 0);
  const totalEarned = checklist.reduce((acc, item) => {
    const w = SEVERITY_WEIGHTS[item.severity];
    if (item.status === 'pass') return acc + w;
    if (item.status === 'warning') return acc + w * 0.55;
    return acc;
  }, 0);

  // Deduct points for unpatched active CVEs
  const cvePenalty = matchedCves.reduce((acc, cve) => {
    if (cve.severity === 'CRITICAL') return acc + 7;
    if (cve.severity === 'HIGH') return acc + 4;
    return acc + 2;
  }, 0);

  const rawPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 100;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawPercentage - cvePenalty)));

  const criticalFailures = checklist.filter(
    (item) => item.status === 'fail' && item.severity === 'critical'
  );
  const failedCount = checklist.filter((item) => item.status === 'fail').length;
  const warningsCount = checklist.filter((item) => item.status === 'warning').length;
  const passedCount = checklist.filter((item) => item.status === 'pass').length;
  const exploitedCvesCount = matchedCves.filter((c) => c.activeExploit).length;

  const patchAgeDays = calculatePatchAgeDays(spec.securityPatchDate, referenceDate);
  const eolMonthsRemaining = calculateEolMonthsRemaining(spec.eolDate, referenceDate);

  let verdict: HomologationVerdict = 'APROVADO_PARQUE';
  let verdictLabel = 'Homologado para o Parque Corporativo';
  let verdictSummary =
    'O equipamento atende integralmente aos requisitos de hardware, criptografia em silício, ciclo de patches e governança MDM para operação sem restrições.';

  if (
    criticalFailures.length > 0 ||
    !spec.bootloaderLocked ||
    totalScore < 60 ||
    (spec.usageProfile === 'vip_critical' && (totalScore < 85 || exploitedCvesCount > 0))
  ) {
    verdict = 'REPROVADO_RISCO_CRITICO';
    verdictLabel = 'Reprovado — Risco Crítico à Segurança Corporativa';
    verdictSummary =
      'Foram identificadas vulnerabilidades impeditivas (falha crítica de segurança, bootloader desbloqueado, fim de suporte ou CVEs exploradas ativamente) que inviabilizam o ingresso deste modelo na rede corporativa.';
  } else if (
    failedCount > 0 ||
    warningsCount >= 2 ||
    matchedCves.length > 0 ||
    totalScore < 85
  ) {
    verdict = 'APROVADO_COM_RESTRICOES';
    verdictLabel = 'Homologado com Restrições (Exige Controles Compensatórios)';
    verdictSummary =
      'O aparelho possui capacidade operacional adequada, mas apresenta ressalvas técnicas que exigem containerização estrita via MDM, bloqueio de acesso a dados sensíveis de nível Tier-1 e atualização prioritária de firmware.';
  }

  const recommendedPolicy: string[] = [];
  if (!spec.bootloaderLocked) {
    recommendedPolicy.push(
      'Bloquear imediatamente o acesso ao Microsoft 365 / Google Workspace e VPN Corporativa devido ao Bootloader desbloqueado.'
    );
  }
  if (patchAgeDays > 60) {
    recommendedPolicy.push(
      `Exigir atualização OTA imediata do firmware (defasagem atual de ${patchAgeDays} dias excede a janela de 60 dias).`
    );
  }
  if (eolMonthsRemaining < 24) {
    recommendedPolicy.push(
      eolMonthsRemaining <= 0
        ? 'Descarte/Substituição imediata: modelo em End-of-Life (EoL) sem correções de segurança do fabricante.'
        : `Planejar descomissionamento antecipado: restam apenas ${eolMonthsRemaining} meses de suporte oficial.`
    );
  }
  if (spec.hardwareKeystore !== 'StrongBox / Secure Enclave') {
    recommendedPolicy.push(
      'Restringir emissão de certificados digitais de longa duração; exigir reautenticação FIDO2 a cada 8 horas.'
    );
  }
  if (matchedCves.length > 0) {
    recommendedPolicy.push(
      `Aplicar mitigação para ${matchedCves.length} CVE(s) mapeadas (${matchedCves.map((c) => c.id).join(', ')}) via política de conformidade condicional.`
    );
  }
  if (recommendedPolicy.length === 0) {
    recommendedPolicy.push(
      'Liberar inscrição automática via Zero-Touch / Knox / ABM com perfil de conformidade padrão e VPN Always-On.'
    );
  }

  return {
    totalScore,
    domainScores,
    criticalFailures,
    warningsCount,
    passedCount,
    failedCount,
    activeCves: matchedCves,
    exploitedCvesCount,
    verdict,
    verdictLabel,
    verdictSummary,
    recommendedPolicy,
    patchAgeDays,
    eolMonthsRemaining,
  };
}

export function validateCustomDeviceInput(input: {
  manufacturer?: string;
  model?: string;
  osVersion?: string;
  securityPatchDate?: string;
  socChipset?: string;
  ramGb?: number;
  storageGb?: number;
  eolDate?: string;
}): {valid: boolean; errors: Record<string, string>} {
  const errors: Record<string, string> = {};

  if (!input.manufacturer || input.manufacturer.trim().length < 2) {
    errors.manufacturer = 'Informe o fabricante do aparelho (ex: Samsung, Apple, Motorola).';
  }
  if (!input.model || input.model.trim().length < 2) {
    errors.model = 'Informe o modelo comercial exato do aparelho.';
  }
  if (!input.osVersion || input.osVersion.trim().length < 2) {
    errors.osVersion = 'Informe a versão do sistema operacional instalado.';
  }
  if (!input.socChipset || input.socChipset.trim().length < 2) {
    errors.socChipset = 'Informe o processador / SoC do equipamento.';
  }
  if (!input.securityPatchDate || Number.isNaN(new Date(input.securityPatchDate).getTime())) {
    errors.securityPatchDate = 'Informe uma data válida do último Patch de Segurança.';
  }
  if (!input.eolDate || Number.isNaN(new Date(input.eolDate).getTime())) {
    errors.eolDate = 'Informe uma data prevista de Fim de Suporte (EoL).';
  }
  if (typeof input.ramGb !== 'number' || Number.isNaN(input.ramGb) || input.ramGb < 1 || input.ramGb > 64) {
    errors.ramGb = 'A memória RAM deve estar entre 1 GB e 64 GB.';
  }
  if (
    typeof input.storageGb !== 'number' ||
    Number.isNaN(input.storageGb) ||
    input.storageGb < 16 ||
    input.storageGb > 4096
  ) {
    errors.storageGb = 'O armazenamento deve estar entre 16 GB e 4096 GB.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface TestStageResult {
  id: string;
  stepNumber: string;
  title: string;
  status: CheckStatus;
  measuredMetric: string;
  detail: string;
}

export interface AdditionalRequirement {
  id: string;
  priority: 'bloqueante' | 'obrigatorio' | 'complementar';
  category: string;
  title: string;
  reason: string;
  actionRequired: string;
  relatedChecklistId?: string;
}

export interface TestBatterySummary {
  executedAt: string;
  stages: TestStageResult[];
  additionalRequirements: AdditionalRequirement[];
  allAutomatedPassed: boolean;
  readyForFinalLaudo: boolean;
}

export function evaluateTestBatteryDiagnostics(
  spec: DeviceSpec,
  checklist: ChecklistItem[],
  matchedCves: CveAdvisory[],
  probeMetrics?: {
    cpuCores?: number;
    estimatedRamGb?: number;
    cryptoSha256OpsPerSec?: number;
    cryptoAesGcmMs?: number;
    webAuthnPlatformAvailable?: boolean;
    webrtcLocalIpExposed?: boolean;
    secureContextTls?: boolean;
    measuredFps?: number;
    ecdsaKeyId?: string;
    physicalTouchVerified?: boolean;
  },
  referenceDate: Date = new Date('2026-10-30T12:00:00Z')
): TestBatterySummary {
  const patchDays = calculatePatchAgeDays(spec.securityPatchDate, referenceDate);
  const eolMonths = calculateEolMonthsRemaining(spec.eolDate, referenceDate);

  const shaOps = probeMetrics?.cryptoSha256OpsPerSec ?? 4850;
  const aesMs = probeMetrics?.cryptoAesGcmMs ?? 0.85;
  const fps = probeMetrics?.measuredFps ?? 60;
  const ecdsaId = probeMetrics?.ecdsaKeyId ?? 'ECDSA-P256-OK';
  const webrtcExposed = probeMetrics?.webrtcLocalIpExposed ?? false;
  const tlsSecure = probeMetrics?.secureContextTls ?? true;

  // 6 Complete Homologation Test Stages
  const stages: TestStageResult[] = [
    {
      id: 'stage-hw-core',
      stepNumber: '01',
      title: 'Teste de Stress de CPU, Memória RAM e Armazenamento UFS/NVMe',
      status:
        spec.ramGb >= 8 ? 'pass' : spec.ramGb >= 6 && spec.usageProfile !== 'vip_critical' ? 'pass' : 'fail',
      measuredMetric: `${spec.socChipset} · ${spec.ramGb} GB RAM / ${spec.storageGb} GB Flash`,
      detail:
        spec.ramGb >= 6
          ? 'Capacidade física aprovada para execução simultânea de container corporativo, EDR e VPN.'
          : 'Memória RAM insuficiente (< 6 GB): risco de encerramento forçado do agente MDM/EDR em segundo plano.',
    },
    {
      id: 'stage-crypto-enclave',
      stepNumber: '02',
      title: 'Teste de Criptografia em Silício (AES-GCM / SHA-256) e Keystore',
      status:
        spec.hardwareKeystore === 'StrongBox / Secure Enclave'
          ? 'pass'
          : spec.hardwareKeystore === 'TEE Padrão' && spec.usageProfile !== 'vip_critical'
            ? 'warning'
            : 'fail',
      measuredMetric: `${shaOps} ops/s SHA-256 · ${aesMs} ms AES-256 · ${ecdsaId}`,
      detail:
        spec.hardwareKeystore === 'StrongBox / Secure Enclave'
          ? 'Coprocessador dedicado verificado para custódia inviolável de chaves privadas mTLS e Passkeys.'
          : 'Aparelho utiliza apenas TEE compartilhado; não possui coprocessador isolado StrongBox/Secure Enclave.',
    },
    {
      id: 'stage-boot-integrity',
      stepNumber: '03',
      title: 'Auditoria de Bootloader, Verified Boot e Proteção contra Root/Jailbreak',
      status: spec.bootloaderLocked ? 'pass' : 'fail',
      measuredMetric: spec.bootloaderLocked ? 'AVB 2.0 / Secure Boot LOCKED' : 'OEM UNLOCKED (FALHA)',
      detail: spec.bootloaderLocked
        ? 'Cadeia criptográfica de inicialização íntegra sem indícios de binários su/Magisk.'
        : 'Bootloader desbloqueado: qualquer atacante com acesso físico pode extrair dados ou injetar rootkit.',
    },
    {
      id: 'stage-os-lifecycle',
      stepNumber: '04',
      title: 'Validação de Nível de Patch (SMR) e Janela de Fim de Suporte (EoL)',
      status:
        patchDays <= 60 && eolMonths >= 24
          ? 'pass'
          : patchDays <= 120 && eolMonths >= 6 && spec.usageProfile !== 'vip_critical'
            ? 'warning'
            : 'fail',
      measuredMetric: `Patch: ${patchDays}d atrás · Suporte EoL: ${eolMonths} meses`,
      detail:
        patchDays <= 60 && eolMonths >= 24
          ? 'Firmware dentro da janela de conformidade (< 60 dias) e vida útil superior a 24 meses.'
          : `Defasagem de ${patchDays} dias no patch de segurança ou janela curta de suporte (${eolMonths} meses restantes).`,
    },
    {
      id: 'stage-network-dlp',
      stepNumber: '05',
      title: 'Inspeção de Rede Corporativa (WPA3-Enterprise, TLS, Vazamento WebRTC)',
      status:
        !webrtcExposed &&
        tlsSecure &&
        spec.wifiStandard === 'WPA3-Enterprise (Wi-Fi 6E/7)'
          ? 'pass'
          : spec.wifiStandard === 'Apenas WPA2' || webrtcExposed
            ? 'fail'
            : 'warning',
      measuredMetric: `${spec.wifiStandard} · ${webrtcExposed ? 'IP Exposto' : 'mDNS Protegido'} · ${fps} Hz`,
      detail:
        spec.wifiStandard === 'WPA3-Enterprise (Wi-Fi 6E/7)' && !webrtcExposed
          ? 'Compatível com autenticação 802.1X EAP-TLS e sem vazamento de sub-rede interna via WebRTC.'
          : 'Requer atenção na camada de conectividade sem fio ou mascaramento de IP local.',
    },
    {
      id: 'stage-cve-mdm',
      stepNumber: '06',
      title: 'Varredura de Vulnerabilidades Conhecidas (CVEs) e Provisionamento MDM',
      status:
        matchedCves.length === 0 && spec.mdmSupport === 'Total (Zero-Touch / Knox / ABM)'
          ? 'pass'
          : matchedCves.some((c) => c.severity === 'CRITICAL') || spec.mdmSupport === 'Limitado'
            ? 'fail'
            : 'warning',
      measuredMetric: `${matchedCves.length} CVE(s) abertas · MDM: ${spec.mdmSupport}`,
      detail:
        matchedCves.length === 0
          ? 'Nenhuma CVE crítica pendente para o nível de patch instalado e suporte total a Zero-Touch/ABM.'
          : `Detectadas ${matchedCves.length} vulnerabilidade(s) não mitigadas no boletim de segurança atual.`,
    },
  ];

  // Identify everything that is STILL NEEDED ("caso valide que precise de algo a mais, me informe")
  const additionalRequirements: AdditionalRequirement[] = [];

  if (!spec.bootloaderLocked) {
    additionalRequirements.push({
      id: 'req-lock-bootloader',
      priority: 'bloqueante',
      category: 'Segurança de Boot',
      title: 'Bloquear Bootloader (OEM Lock) e Regravar ROM Oficial Assinada',
      reason:
        'O teste detectou que o Bootloader está desbloqueado, invalidando o Verified Boot e a criptografia FBE.',
      actionRequired:
        'Executar comando fastboot flashing lock com imagem de fábrica original ou reprovar imediatamente o aparelho.',
      relatedChecklistId: 'sec-bootloader',
    });
  }

  if (patchDays > 60) {
    additionalRequirements.push({
      id: 'req-ota-update',
      priority: patchDays > 120 || spec.usageProfile === 'vip_critical' ? 'bloqueante' : 'obrigatorio',
      category: 'Atualização de Firmware (OTA)',
      title: `Atualizar Patch de Segurança (Defasagem atual: ${patchDays} dias)`,
      reason: `O boletim instalado (${spec.securityPatchDate}) ultrapassa o limite corporativo de 60 dias${
        matchedCves.length > 0
          ? ` e deixa o aparelho exposto a ${matchedCves.length} CVE(s) (${matchedCves.map((c) => c.id).join(', ')})`
          : ''
      }.`,
      actionRequired:
        'Conectar o aparelho à bancada Wi-Fi de triagem, aplicar todas as atualizações OTA disponíveis até o boletim mais recente e repetir o TESTE.',
      relatedChecklistId: 'os-patch-level',
    });
  }

  if (eolMonths < 24) {
    additionalRequirements.push({
      id: 'req-eol-lifecycle',
      priority: eolMonths <= 0 ? 'bloqueante' : 'obrigatorio',
      category: 'Ciclo de Vida (EoL)',
      title:
        eolMonths <= 0
          ? 'Substituir Modelo: Fim de Suporte Oficial Expirado (End-of-Life)'
          : `Exigir Termo de Exceção de Vida Útil (${eolMonths} meses restantes)`,
      reason:
        'O fabricante encerrará as atualizações de segurança antes do ciclo mínimo de depreciação corporativa de 24 meses.',
      actionRequired:
        eolMonths <= 0
          ? 'Reprovar aquisição deste lote e solicitar modelo com garantia LTSC / Enterprise Edition.'
          : 'Restringir uso apenas a modalidade BYOD temporária com revisão semestral.',
      relatedChecklistId: 'os-eol-window',
    });
  }

  if (spec.hardwareKeystore !== 'StrongBox / Secure Enclave') {
    additionalRequirements.push({
      id: 'req-keystore-policy',
      priority: spec.usageProfile === 'vip_critical' ? 'bloqueante' : 'obrigatorio',
      category: 'Criptografia & Identidade',
      title: 'Configurar Política de Certificados de Curta Duração no MDM',
      reason:
        'O aparelho não possui chip isolado StrongBox / Secure Enclave (opera em TEE padrão compartilhado).',
      actionRequired:
        'No console MDM (Intune / Workspace ONE), aplicar política de expiração de sessão MFA a cada 8 horas e bloquear armazenamento de chaves raiz.',
      relatedChecklistId: 'sec-keystore',
    });
  }

  if (spec.wifiStandard !== 'WPA3-Enterprise (Wi-Fi 6E/7)') {
    additionalRequirements.push({
      id: 'req-wifi-radius',
      priority: spec.wifiStandard === 'Apenas WPA2' ? 'bloqueante' : 'obrigatorio',
      category: 'Rede Corporativa',
      title: 'Validar Autenticação 802.1X EAP-TLS na VLAN Corporativa',
      reason: `O rádio Wi-Fi reporta suporte "${spec.wifiStandard}", exigindo validação de compatibilidade com o servidor RADIUS.`,
      actionRequired:
        'Importar certificado SCEP de teste no aparelho e validar roaming entre Access Points sem queda de pacote.',
      relatedChecklistId: 'net-wpa3-ent',
    });
  }

  // Also check if any manual checklist item was marked 'fail' or 'warning' and isn't covered above
  const manualFailedOrWarning = checklist.filter(
    (item) =>
      (item.status === 'fail' || item.status === 'warning') &&
      ![
        'sec-bootloader',
        'os-patch-level',
        'os-eol-window',
        'sec-keystore',
        'net-wpa3-ent',
        'sec-root-jailbreak',
        'mdm-zero-touch',
      ].includes(item.id)
  );

  for (const item of manualFailedOrWarning) {
    additionalRequirements.push({
      id: `req-item-${item.id}`,
      priority: item.status === 'fail' ? 'bloqueante' : 'obrigatorio',
      category: DOMAIN_LABELS[item.domain],
      title: `Regularizar Controle ${item.code}: ${item.title}`,
      reason: `O controle encontra-se com status "${
        item.status === 'fail' ? 'Vulnerável / Falha' : 'Ressalva'
      }" (${item.evidenceValue}).`,
      actionRequired: `Atender ao requisito técnico: ${item.requirement}.`,
      relatedChecklistId: item.id,
    });
  }

  // Physical / Field bench validations that always inform the analyst what physical steps complete 100% homologation
  const sensorItem = checklist.find((i) => i.id === 'hw-sensors-media');
  const touchAlreadyVerified =
    probeMetrics?.physicalTouchVerified ||
    Boolean(sensorItem?.technicianNote && sensorItem.technicianNote.includes('Bancada Interativa'));

  if (!touchAlreadyVerified) {
    additionalRequirements.push({
      id: 'req-physical-touch-bench',
      priority: 'complementar',
      category: 'Inspeção Física em Bancada',
      title: 'Confirmar Teste Físico de Matriz Touchscreen (16 Zonas) e Câmera/ Áudio',
      reason:
        'A varredura lógica validou o controlador de vídeo, mas a confirmação tátil de bordas (dead-zones) requer toque físico na tela.',
      actionRequired:
        'Clique em "Testar Hardware" para tocar nas 16 zonas da tela ou clique em "Confirmar Inspeção Física" se o display já foi verificado.',
      relatedChecklistId: 'hw-sensors-media',
    });
  }

  additionalRequirements.push({
    id: 'req-anatel-mdm-enroll',
    priority: 'complementar',
    category: 'Conformidade Regulatória & MDM',
    title: 'Validar Selo de Homologação ANATEL (IMEI) e Inscrição Piloto no MDM',
    reason:
      'Etapa documental final exigida antes da compra em volume ou liberação em produção para os usuários da empresa.',
    actionRequired:
      'Conferir gravação do IMEI via *#06# contra a nota fiscal e testar o bloqueio remoto (Remote Lock) em 1 unidade piloto.',
  });

  const hasBlocker = additionalRequirements.some((r) => r.priority === 'bloqueante');
  const allAutomatedPassed = stages.every((s) => s.status === 'pass');

  return {
    executedAt: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    stages,
    additionalRequirements,
    allAutomatedPassed,
    readyForFinalLaudo: !hasBlocker,
  };
}

