export interface LiveProbeResult {
  timestamp: string;
  detectedPlatform: string;
  userAgentSummary: string;
  cpuCores: number;
  estimatedRamGb: number;
  gpuVendor: string;
  gpuRenderer: string;
  screenResolution: string;
  pixelRatio: number;
  touchPoints: number;
  storageQuotaGb: number | null;
  secureContextTls: boolean;
  webAuthnPlatformAvailable: boolean;
  cryptoSha256OpsPerSec: number;
  cryptoAesGcmMs: number;
  connectionType: string;
  batteryLevelPct: number | null;
  webrtcLocalIpExposed: boolean;
  mediaInputsDetected: {
    cameras: number;
    microphones: number;
  };
}

export async function runLiveHardwareAndSecurityProbe(): Promise<LiveProbeResult> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const win = typeof window !== 'undefined' ? window : undefined;

  // 1. CPU & RAM
  const cpuCores = nav?.hardwareConcurrency || 8;
  const rawMemory = (nav as unknown as {deviceMemory?: number})?.deviceMemory;
  const estimatedRamGb = typeof rawMemory === 'number' ? rawMemory : 8;

  // 2. Platform & User Agent
  const ua = nav?.userAgent || 'Dispositivo Corporativo';
  let detectedPlatform = 'SO Mobile / Desktop';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9.]+)/i);
    detectedPlatform = match ? `Android ${match[1]}` : 'Android OS';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/i);
    detectedPlatform = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'Apple iOS';
  } else if (/Mac OS X/i.test(ua)) {
    detectedPlatform = 'macOS (Bancada de Homologação)';
  } else if (/Windows/i.test(ua)) {
    detectedPlatform = 'Windows (Bancada de Homologação)';
  } else if (/Linux/i.test(ua)) {
    detectedPlatform = 'Linux / Container Kernel';
  }

  // 3. WebGL GPU / SoC Renderer inspection
  let gpuVendor = 'GPU Integrada Padrão';
  let gpuRenderer = 'Renderizador Hardware WebGL';
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gpuVendor;
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
        } else {
          gpuVendor = gl.getParameter(gl.VENDOR) || gpuVendor;
          gpuRenderer = gl.getParameter(gl.RENDERER) || gpuRenderer;
        }
      }
    } catch {
      // Fallback if WebGL is restricted
    }
  }

  // 4. Screen & Touch Matrix
  const screenResolution =
    win && win.screen ? `${win.screen.width} × ${win.screen.height}` : '1920 × 1080';
  const pixelRatio = win ? Number((win.devicePixelRatio || 1).toFixed(2)) : 2;
  const touchPoints = nav?.maxTouchPoints ?? 0;

  // 5. Storage Quota
  let storageQuotaGb: number | null = null;
  if (nav?.storage && typeof nav.storage.estimate === 'function') {
    try {
      const estimate = await nav.storage.estimate();
      if (estimate.quota) {
        storageQuotaGb = Math.round(estimate.quota / (1024 * 1024 * 1024));
      }
    } catch {
      storageQuotaGb = null;
    }
  }

  // 6. TLS Secure Context & WebAuthn Hardware Authenticator (Secure Enclave / StrongBox)
  const secureContextTls = Boolean(win?.isSecureContext);
  let webAuthnPlatformAvailable = false;
  if (
    win &&
    'PublicKeyCredential' in win &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      webAuthnPlatformAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      webAuthnPlatformAvailable = false;
    }
  }

  // 7. Hardware Crypto Benchmark (SubtleCrypto SHA-256 + AES-GCM 256-bit)
  let cryptoSha256OpsPerSec = 4200;
  let cryptoAesGcmMs = 1.4;
  if (win?.crypto?.subtle) {
    try {
      const payload = new Uint8Array(64 * 1024); // 64 KB buffer
      for (let i = 0; i < payload.length; i += 64) {
        payload[i] = i & 0xff;
      }
      const startSha = performance.now();
      const iterations = 25;
      for (let i = 0; i < iterations; i++) {
        await win.crypto.subtle.digest('SHA-256', payload);
      }
      const elapsedShaMs = Math.max(0.5, performance.now() - startSha);
      cryptoSha256OpsPerSec = Math.round((iterations / elapsedShaMs) * 1000);

      const startAes = performance.now();
      const key = await win.crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt']
      );
      const iv = win.crypto.getRandomValues(new Uint8Array(12));
      await win.crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, payload);
      cryptoAesGcmMs = Number(Math.max(0.1, performance.now() - startAes).toFixed(2));
    } catch {
      // Fallback values if SubtleCrypto is unavailable
    }
  }

  // 8. Network Connection Info
  const conn = (nav as unknown as {connection?: {effectiveType?: string; downlink?: number}})
    ?.connection;
  const connectionType = conn?.effectiveType
    ? `${conn.effectiveType.toUpperCase()}${conn.downlink ? ` (${conn.downlink} Mbps)` : ''}`
    : 'TLS / Rede Corporativa';

  // 9. Battery API (if supported on Android/Chrome)
  let batteryLevelPct: number | null = null;
  if (nav && 'getBattery' in nav) {
    try {
      const bat = await (
        nav as unknown as {getBattery: () => Promise<{level: number}>}
      ).getBattery();
      if (bat && typeof bat.level === 'number') {
        batteryLevelPct = Math.round(bat.level * 100);
      }
    } catch {
      batteryLevelPct = null;
    }
  }

  // 10. Media Devices Enumeration (count inputs without triggering invasive prompts)
  const mediaInputsDetected = {cameras: 0, microphones: 0};
  if (nav?.mediaDevices && typeof nav.mediaDevices.enumerateDevices === 'function') {
    try {
      const devices = await nav.mediaDevices.enumerateDevices();
      mediaInputsDetected.cameras = devices.filter((d) => d.kind === 'videoinput').length;
      mediaInputsDetected.microphones = devices.filter((d) => d.kind === 'audioinput').length;
    } catch {
      // Ignore
    }
  }

  // 11. WebRTC Local IP Leak Check (verifies mDNS obfuscation)
  let webrtcLocalIpExposed = false;
  if (win && 'RTCPeerConnection' in win) {
    try {
      const pc = new RTCPeerConnection({iceServers: []});
      pc.createDataChannel('homologit_probe');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdp = offer.sdp || '';
      const rawIpRegex = /\b(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}\b/;
      webrtcLocalIpExposed = rawIpRegex.test(sdp);
      pc.close();
    } catch {
      webrtcLocalIpExposed = false;
    }
  }

  return {
    timestamp: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
    detectedPlatform,
    userAgentSummary: ua.slice(0, 96),
    cpuCores,
    estimatedRamGb,
    gpuVendor,
    gpuRenderer,
    screenResolution,
    pixelRatio,
    touchPoints,
    storageQuotaGb,
    secureContextTls,
    webAuthnPlatformAvailable,
    cryptoSha256OpsPerSec,
    cryptoAesGcmMs,
    connectionType,
    batteryLevelPct,
    webrtcLocalIpExposed,
    mediaInputsDetected,
  };
}
