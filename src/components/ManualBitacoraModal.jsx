"use client";

import { 
  XMarkIcon, 
  MapIcon, 
  InformationCircleIcon, 
  ClipboardDocumentIcon, 
  PencilSquareIcon, 
  LinkIcon, 
  CubeIcon,
  ClipboardDocumentCheckIcon,
  TagIcon,
  ClockIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";

export default function ManualBitacoraModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const statusList = [
    { name: "COMPLETO", color: "bg-green-100 text-green-800", desc: "El trámite ha finalizado y no requiere más acciones." },
    { name: "PENDIENTE", color: "bg-yellow-100 text-yellow-800", desc: "A la espera de una acción o respuesta general." },
    { name: "PENDIENTE ASESOR", color: "bg-orange-100 text-orange-800", desc: "Se requiere atención o información del asesor asignado." },
    { name: "PENDIENTE COMPAÑIA", color: "bg-red-100 text-red-800", desc: "En espera de respuesta por parte de la aseguradora." }
  ];

  const typesList = [
    { name: "EMISIÓN", color: "border-blue-500", desc: "Alta de póliza nueva." },
    { name: "COTIZACIÓN", color: "border-amber-500", desc: "Propuesta presupuesto." },
    { name: "ENDOSO", color: "border-purple-500", desc: "Modificación técnica." },
    { name: "CANCELACIÓN", color: "border-red-500", desc: "Baja de la póliza." },
    { name: "REEXPEDICIÓN", color: "border-emerald-500", desc: "Anulación y re-emisión." },
    { name: "RENOVACIÓN", color: "border-sky-500", desc: "Vigencia renovada." },
    { name: "APLICACIÓN DE PAGO", color: "border-violet-500", desc: "Conciliación bancaria." },
    { name: "OTRO", color: "border-slate-500", desc: "Gestiones generales." }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Guía de Bitácora</h2>
            <p className="text-sm text-muted-foreground">Manual de Usuario - Complemento Outlook</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Section: Acceso y Navegación */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Acceso y Navegación</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">Accede rápidamente a las funciones principales desde la cinta de opciones (Ribbon) de Outlook:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { id: 1, title: "Ver Bitácora", desc: "Abre el panel lateral para el seguimiento de trazabilidad del correo actual." },
                { id: 2, title: "Ver Aplicación", desc: "Cambia la vista para gestionar expedientes y pólizas vinculadas." },
                { id: 3, title: "Botones de Panel", desc: "Utiliza las pestañas inferiores en el panel lateral para alternar entre Bitácora y Aplicaciones." }
              ].map((step) => (
                <div key={step.id} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    {step.id}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 py-4 px-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="flex gap-8 bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex flex-col items-center gap-1">
                  <ClockIcon className="h-6 w-6 text-primary" />
                  <span className="text-[10px] text-gray-500 font-medium">Ver Bitácora</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-primary" />
                  <span className="text-[10px] text-gray-500 font-medium">Ver Aplicación</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-[10px] font-bold text-blue-700">
                  Bitácora
                </div>
                <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md text-[10px] font-bold text-gray-400">
                  Aplicaciones
                </div>
              </div>
            </div>
          </section>

          {/* Section: Resumen de Seguimiento */}
          <section className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex gap-4">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Resumen de Seguimiento</h3>
              <p className="text-sm text-blue-800 leading-relaxed mb-3">
                <strong>Actualización Constante:</strong> El estatus debe cambiarse con <strong>cada respuesta</strong> que emitas. Esto es vital para mantener la trazabilidad exacta del hilo hasta su cierre.
              </p>
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Tiempos Automáticos:</strong> El sistema registra la fecha y hora <strong>automáticamente</strong> en el instante en que guardas cualquier actualización.
              </p>
            </div>
          </section>

          {/* Section: Vista Actual: Seguimiento */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <ClipboardDocumentIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Vista Actual: Seguimiento</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Utiliza esta pestaña cuando el sistema detecte trazabilidad previa en el correo seleccionado:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 1, title: "Verificar Registro", desc: "Confirma que el ID de Registro y los datos correspondan al trámite." },
                { id: 2, title: "Actualizar Estado", desc: "Modifica el estatus según el avance (ej. PENDIENTE ASESOR)." },
                { id: 3, title: "Guardar Cambios", desc: "Haz clic en guardar. Los tiempos se actualizarán automáticamente." }
              ].map((step) => (
                <div key={step.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px] mb-3">
                    {step.id}
                  </div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">{step.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Generación de Registros */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <PencilSquareIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Generación de Registros</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Utiliza esta pestaña para iniciar la trazabilidad de un nuevo trámite:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { id: 1, title: "Iniciar Formulario", desc: "Ingresa los datos iniciales: Usuario asignado, Tipo y Estatus." },
                { id: 2, title: "Generar RefID", desc: "Al guardar, el sistema genera un RefID único indispensable." },
                { id: 3, title: "Vincular Respuesta", desc: "Indispensable incluir el código [RefID: 12345] en tu respuesta." }
              ].map((step) => (
                <div key={step.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-[10px] mb-3">
                    {step.id}
                  </div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">{step.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 flex gap-4">
              <LinkIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">Regla de Oro: Vinculación</h3>
                <p className="text-sm text-orange-800 leading-relaxed">
                  Para que el panel identifique el correo automáticamente, es <strong>obligatorio</strong> incluir el código <strong>[RefID: ***]</strong> en el cuerpo del correo al responder.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Gestión de Aplicaciones */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CubeIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Gestión de Aplicaciones</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h4 className="font-bold text-gray-700 mb-2">Consulta de Historial</h4>
                <p className="text-muted-foreground">Busca por número de Póliza para recuperar todos los movimientos y solicitudes previas.</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h4 className="font-bold text-gray-700 mb-2">Alta de Solicitudes</h4>
                <p className="text-muted-foreground">Registra nuevas aplicaciones vinculando el asunto del correo y el asesor responsable.</p>
              </div>
            </div>
          </section>

          {/* Section: Estatus y Tipos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Estatus */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Catálogo de Estatus</h3>
              </div>
              <div className="space-y-2">
                {statusList.map((st) => (
                  <div key={st.name} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className={`w-32 text-center px-2 py-1 rounded-md text-[9px] font-black tracking-wider ${st.color}`}>
                      {st.name}
                    </span>
                    <p className="text-xs text-gray-600">{st.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tipos */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TagIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Tipos de Trámite</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {typesList.map((type) => (
                  <div key={type.name} className={`px-3 py-2 bg-white border-l-4 rounded-r-lg shadow-sm ${type.color}`}>
                    <h4 className="font-bold text-[10px] text-gray-800">{type.name}</h4>
                    <p className="text-[9px] text-muted-foreground">{type.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 text-center text-xs text-muted-foreground border-t bg-gray-50/50">
          <p>© 2026 Sistema de Trazabilidad MailApp. Guía Oficial de Usuario.</p>
        </div>
      </div>
    </div>
  );
}
