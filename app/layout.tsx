import type {Metadata, Viewport} from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'HomologIT — Homologação e Auditoria Mobile Corporativa',
  description:
    'Plataforma de diagnóstico de hardware, checklist de segurança da informação, análise de vulnerabilidades (CVEs) e homologação de smartphones para o parque corporativo.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HomologIT',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'HomologIT — Homologação e Auditoria Mobile Corporativa',
    description:
      'Plataforma de diagnóstico de hardware, checklist de segurança da informação, análise de vulnerabilidades (CVEs) e homologação de smartphones para o parque corporativo.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HomologIT — Homologação e Auditoria Mobile Corporativa',
    description:
      'Plataforma de diagnóstico de hardware, checklist de segurança da informação, análise de vulnerabilidades (CVEs) e homologação de smartphones para o parque corporativo.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}

