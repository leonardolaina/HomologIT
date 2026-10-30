import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'HomologIT — Homologação e Auditoria Mobile Corporativa',
  description:
    'Plataforma de diagnóstico de hardware, checklist de segurança da informação, análise de vulnerabilidades (CVEs) e homologação de smartphones para o parque corporativo.',
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
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
