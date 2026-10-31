'use client';

import React from 'react';
import {AlertTriangle, RotateCcw} from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-md p-6 shadow-xs">
        <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-rose-700 font-semibold">
          EXCEÇÃO DE EXECUÇÃO · CONSOLE HOMOLOGIT
        </p>
        <h2 className="text-base font-bold text-slate-900 mt-1">
          Falha temporária ao renderizar o módulo
        </h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-200 break-words">
          {error?.message || 'Erro inesperado na sessão de homologação.'}
        </p>
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recarregar Módulo
          </button>
        </div>
      </div>
    </div>
  );
}
