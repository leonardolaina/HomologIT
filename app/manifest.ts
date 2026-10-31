import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'HomologIT — Homologação e Auditoria Mobile Corporativa',
    short_name: 'HomologIT',
    description:
      'Plataforma de diagnóstico de hardware, checklist de segurança da informação, análise de vulnerabilidades (CVEs) e homologação de smartphones para o parque corporativo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    categories: ['security', 'utilities', 'productivity', 'business'],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
