"use client";
import { ClockIcon, UserIcon, ArrowRightIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export default function AplicacionHistoryTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-border">
        <InformationCircleIcon className="w-4 h-4" />
        No hay historial disponible para esta aplicación.
      </div>
    );
  }

  return (
    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
      {history.map((item, idx) => (
        <div key={item.id || idx} className="relative flex items-start gap-6 group">
          {/* Dot */}
          <div className="absolute left-5 -translate-x-1/2 mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-primary z-10 group-hover:scale-125 transition-transform" />
          
          <div className="flex-1 bg-white dark:bg-gray-800 border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  item.accion === 'INSERT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                  item.accion === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30'
                }`}>
                  {item.accion}
                </span>
                <span className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> {item.cambiado_por}
                </span>
              </div>
              <time className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ClockIcon className="w-3 h-3" /> {new Date(item.fecha_cambio).toLocaleString('es-MX')}
              </time>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Estatus Change */}
              {(item.estatus_anterior || item.estatus_nuevo) && (
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-tight">Estatus</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-red-500 opacity-60 bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded">
                      {item.estatus_anterior || 'N/A'}
                    </span>
                    <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/10 px-1.5 py-0.5 rounded">
                      {item.estatus_nuevo || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* Poliza Change (if applicable) */}
              {(item.poliza_anterior !== item.poliza_nueva) && (
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-tight">Póliza</p>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60">{item.poliza_anterior || '-'}</span>
                    <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">{item.poliza_nueva || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {(item.observaciones_nueva || item.asunto_nuevo) && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                {item.asunto_nuevo && (
                  <div>
                    <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-tight">Asunto</p>
                    <p className="text-xs text-foreground/90">{item.asunto_nuevo}</p>
                  </div>
                )}
                {item.observaciones_nueva && (
                  <div>
                    <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-tight">Observaciones</p>
                    <p className="text-xs text-foreground/90 italic">"{item.observaciones_nueva}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
