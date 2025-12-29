"use client";

import { useState } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useRouter } from "next/navigation";

export default function CreateIngresoButton({ asesores }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [form, setForm] = useState({
        fecha_ingreso: new Date().toISOString().slice(0, 10),
        asesor_id: "",
        folio: "",
        poliza: "",
        compania: "",
        tipo_solicitud: "",
        estatus: "INGRESO",
        observacion: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/ingresos/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error creando registro");
            }

            setIsOpen(false);
            router.refresh();
            // Reset form (optional, or keep date)
            setForm(prev => ({ ...prev, folio: "", poliza: "", observacion: "" }));
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="btn-primary gap-2 text-xs h-8 px-3"
                title="Añadir Ingreso"
            >
                <PlusIcon className="w-4 h-4" />
                Crear Registro
            </button>

            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <DialogPanel className="max-w-xl w-full bg-background border border-border rounded-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <DialogTitle className="text-xl font-bold mb-4">Añadir Ingreso</DialogTitle>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Fecha Ingreso *</label>
                                    <input
                                        type="date"
                                        name="fecha_ingreso"
                                        required
                                        value={form.fecha_ingreso}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Asesor *</label>
                                    <select
                                        name="asesor_id"
                                        required
                                        value={form.asesor_id}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {asesores.map(a => (
                                            <option key={a.id} value={a.id}>{a.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Folio</label>
                                    <input
                                        type="text"
                                        name="folio"
                                        value={form.folio}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Póliza</label>
                                    <input
                                        type="text"
                                        name="poliza"
                                        value={form.poliza}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Compañía</label>
                                    <select
                                        name="compania"
                                        value={form.compania}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="QUALITAS">QUALITAS</option>
                                        <option value="GNP">GNP</option>
                                        <option value="AXA">AXA</option>
                                        <option value="HDI">HDI</option>
                                        <option value="GS">GS</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Tipo Solicitud</label>
                                    <select
                                        name="tipo_solicitud"
                                        value={form.tipo_solicitud}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="DXN">DXN</option>
                                        <option value="CONT">CONT</option>
                                        <option value="MENS">MENS</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Estatus</label>
                                    <select
                                        name="estatus"
                                        value={form.estatus}
                                        onChange={handleChange}
                                        className="w-full h-9 rounded border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-accent"
                                    >
                                        <option value="INGRESO">INGRESO</option>
                                        <option value="EN COMERCIAL">EN COMERCIAL</option>
                                        <option value="REGRESO ASESOR">REGRESO ASESOR</option>
                                        <option value="SIN INGRESO">SIN INGRESO</option>
                                        <option value="CANCELACION">CANCELACION</option>
                                        <option value="COMPLETO">COMPLETO</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Observación</label>
                                <textarea
                                    name="observacion"
                                    value={form.observacion}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-accent resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="btn-secondary"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
