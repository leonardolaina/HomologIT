import Link from 'next/link';
import {ShieldAlert, ArrowLeft} from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-md p-6 shadow-xs">
        <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center mb-4">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          HTTP 404 · ROTA NÃO ENCONTRADA
        </p>
        <h1 className="text-lg font-bold text-slate-900 mt-1">
          Página de Homologação Indisponível
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          O recurso ou laudo solicitado não foi localizado neste terminal de auditoria mobile corporativa.
        </p>
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Console HomologIT
          </Link>
        </div>
      </div>
    </main>
  );
}
