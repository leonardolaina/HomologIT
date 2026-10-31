'use client';

import React, {useState, useEffect} from 'react';
import {
  QrCode,
  Smartphone,
  Download,
  Copy,
  Check,
  X,
  Share2,
  ExternalLink,
  FileCode2,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import {
  SHARED_PUBLIC_APP_URL,
  resolveMobileAccessUrls,
  generateMobileQrCodeSvg,
  generateStandaloneMobileBuildHtml,
  generateCapacitorConfigJson,
} from '@/lib/mobile-access-pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker for universal PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore registration errors in restricted iframe contexts
      });
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Offline Ativo — Operando com pacote local em cache</span>
    </div>
  );
}

interface MobileQrAndBuildSectionProps {
  onOpenModal: () => void;
}

export function MobileQrAndBuildBanner({
  onOpenModal,
}: MobileQrAndBuildSectionProps) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadedHtml, setDownloadedHtml] = useState(false);
  const {isInstallable, isInstalled, install} = usePWAInstall();

  const targetUrl = SHARED_PUBLIC_APP_URL;

  useEffect(() => {
    let active = true;
    generateMobileQrCodeSvg(targetUrl)
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [targetUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadStandaloneBuild = () => {
    const htmlContent = generateStandaloneMobileBuildHtml(targetUrl);
    const blob = new Blob([htmlContent], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HomologIT-Mobile-Universal-v1.0.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedHtml(true);
    setTimeout(() => setDownloadedHtml(false), 3000);
  };

  return (
    <div
      data-testid="mobile-qr-build-banner"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Scannable QR Code */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div
            data-testid="qr-code-svg-container"
            className="w-44 h-44 bg-white p-2.5 rounded-xl border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs"
            aria-label="QR Code de acesso mobile para qualquer celular"
          >
            {qrSvg ? (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{__html: qrSvg}}
              />
            ) : (
              <QrCode className="w-16 h-16 text-slate-400 animate-pulse" />
            )}
          </div>
          <div className="text-center sm:text-left lg:text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
              <QrCode className="w-3 h-3 shrink-0" />
              QR Code Universal Ativo
            </span>
            <p className="text-xs font-semibold text-slate-900">
              Aponte a câmera de qualquer Android ou iPhone
            </p>
            <p className="text-[11px] text-slate-600 leading-snug">
              Funciona via 4G, 5G ou Wi-Fi em qualquer celular sem precisar estar na mesma rede.
            </p>
          </div>
        </div>

        {/* Right: Universal Mobile Compilation & PWA Install Options */}
        <div className="lg:col-span-8 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500">
                DISTRIBUIÇÃO MOBILE &amp; COMPILAÇÃO MULTIPLATAFORMA
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-900 text-white">
                Android · iOS · PWA Standalone · HTML5 Offline
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Acesse via QR Code ou Baixe a Compilação para Qualquer Celular
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Escaneie o QR Code ao lado para abrir e instalar o aplicativo <strong>HomologIT PWA</strong> diretamente na tela inicial do celular, ou baixe a compilação portátil autocontida (<code>.html</code> / manifesto nativo APK &amp; IPA) para executar em campo mesmo sem internet.
            </p>
          </div>

          {/* Direct Public URL Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex-1 min-w-0 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Link Direto para Qualquer Celular (URL Pública Cloud)
              </p>
              <p
                data-testid="mobile-public-url-text"
                className="text-xs font-mono font-semibold text-slate-900 truncate"
              >
                {targetUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="btn-copy-mobile-url"
                onClick={handleCopyUrl}
                className="px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Link
                  </>
                )}
              </button>
              <button
                type="button"
                data-testid="btn-open-qr-modal-banner"
                onClick={onOpenModal}
                className="px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Ampliar QR &amp; Opções
              </button>
            </div>
          </div>

          {/* Action Buttons for Mobile Compilation */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              data-testid="btn-download-mobile-build"
              onClick={handleDownloadStandaloneBuild}
              className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              {downloadedHtml ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Compilação Mobile Baixada (.HTML)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 shrink-0" />
                  Baixar Compilação Portátil Universal (.HTML Offline)
                </>
              )}
            </button>

            {isInstallable && !isInstalled ? (
              <button
                type="button"
                data-testid="btn-pwa-install-native"
                onClick={install}
                className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                Instalar App no Celular (PWA Nativo)
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-open-install-guide"
                onClick={onOpenModal}
                className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                {isInstalled
                  ? 'App Instalado (Ver Opções APK / iOS)'
                  : 'Como Instalar no Android / iPhone (PWA & APK)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MobileQrAndBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileQrAndBuildModal({
  isOpen,
  onClose,
}: MobileQrAndBuildModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(SHARED_PUBLIC_APP_URL);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloadedBuild, setDownloadedBuild] = useState(false);
  const [downloadedCap, setDownloadedCap] = useState(false);
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();

  const runtimeOrigin =
    typeof window !== 'undefined' ? window.location.origin : SHARED_PUBLIC_APP_URL;
  const {endpoints} = resolveMobileAccessUrls(runtimeOrigin);

  const effectiveUrl = customUrl.trim().length > 0 ? customUrl.trim() : selectedUrl;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    generateMobileQrCodeSvg(effectiveUrl)
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, effectiveUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadQrSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HomologIT-QRCode-Acesso-Mobile.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlContent = generateStandaloneMobileBuildHtml(effectiveUrl);
    const blob = new Blob([htmlContent], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HomologIT-Mobile-Universal-v1.0.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedBuild(true);
    setTimeout(() => setDownloadedBuild(false), 2500);
  };

  const handleDownloadCapacitorConfig = () => {
    const jsonContent = generateCapacitorConfigJson(effectiveUrl);
    const blob = new Blob([jsonContent], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacitor.config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedCap(true);
    setTimeout(() => setDownloadedCap(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-qr-modal-title"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
              ACESSO REMOTO &amp; EMPACOTAMENTO MULTIPLATAFORMA (ANDROID / iOS)
            </p>
            <h2
              id="mobile-qr-modal-title"
              className="text-xl font-bold text-slate-900 mt-1"
            >
              QR Code de Acesso Mobile &amp; Compilação para Qualquer Celular
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de QR Code e compilação mobile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Top Grid: Large QR Code + URL Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div
                data-testid="modal-qr-code-box"
                className="w-56 h-56 bg-white p-3 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs"
              >
                {qrSvg ? (
                  <div
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{__html: qrSvg}}
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-slate-400 animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="flex-1 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar QR (.SVG)
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 px-3 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar URL
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Selecione o Endpoint do QR Code
                </p>
                <div className="space-y-2">
                  {endpoints.map((ep) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => {
                        setCustomUrl('');
                        setSelectedUrl(ep.url);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        effectiveUrl === ep.url
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{ep.label}</span>
                        {ep.recommendedForExternalPhones && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              effectiveUrl === ep.url
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            Recomendado (Qualquer Rede)
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] font-mono truncate mt-1 ${
                          effectiveUrl === ep.url ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {ep.url}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="custom-qr-url-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Ou informe um IP/Domínio customizado de bancada:
                </label>
                <input
                  id="custom-qr-url-input"
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="Ex: https://homologit.suaempresa.com.br"
                  className="w-full min-h-[40px] px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: 3 Compilation Modes for Any Phone */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              2. Compilações Prontas para Usar em Qualquer Celular (Android &amp; iOS)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option A: Standalone PWA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Opção 01 · App Instalável (PWA)
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Instalação Direta na Tela Inicial
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Abre em tela cheia (<code>display: standalone</code>) sem barra de navegador, com ícone nativo e cache Service Worker.
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 pt-1">
                    <li>
                      • <strong>Android (Chrome):</strong> Toque em{' '}
                      <em>&ldquo;Instalar Aplicativo&rdquo;</em> ou no menu ⋮ &rarr;{' '}
                      <em>Adicionar à tela inicial</em>.
                    </li>
                    <li>
                      • <strong>iPhone (Safari):</strong> Toque em{' '}
                      <Share2 className="w-3 h-3 inline" /> <em>Compartilhar</em> &rarr;{' '}
                      <em>Adicionar à Tela de Início</em>.
                    </li>
                  </ul>
                </div>

                {isInstallable && !isInstalled ? (
                  <button
                    type="button"
                    onClick={install}
                    className="w-full px-3 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Instalar Agora Neste Dispositivo
                  </button>
                ) : (
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-2.5 min-h-[40px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isIOS ? 'Abrir no Safari para Instalar' : 'Abrir Link Instalável PWA'}
                  </a>
                )}
              </div>

              {/* Option B: Single-File Portable HTML5 Compilation */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-900 text-white">
                    Opção 02 · Compilação Portátil
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Executável Único HTML5 Offline
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Arquivo único compilado (<code>HomologIT-Mobile-Universal-v1.0.html</code>) que pode ser enviado por WhatsApp, e-mail ou cabo USB e aberto em qualquer celular sem internet.
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="modal-btn-download-html-build"
                  onClick={handleDownloadStandaloneHtml}
                  className="w-full px-3 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadedBuild ? 'Compilação Baixada!' : 'Baixar Compilação (.HTML)'}
                </button>
              </div>

              {/* Option C: Native APK / IPA Capacitor Config */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    Opção 03 · Build Nativo APK / IPA
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Configuração Capacitor / WebAPK
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Exporta o manifesto <code>capacitor.config.json</code> pré-configurado com o endpoint da aplicação para geração de pacote <code>.apk</code> (Android) e <code>.ipa</code> (iOS).
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="modal-btn-download-capacitor"
                  onClick={handleDownloadCapacitorConfig}
                  className="w-full px-3 py-2.5 min-h-[40px] text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  {downloadedCap ? 'Config Baixada!' : 'Baixar capacitor.config.json'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Manifesto WebApp ativo em <code>/manifest.webmanifest</code> · Ícones PNG 192px/512px/Maskable + Apple Touch Icon 180px verificados.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
