
"use client";
import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function BuzonesConfigModal({ isOpen, onClose }) {
    const [buzones, setBuzones] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadBuzones();
        }
    }, [isOpen]);

    async function loadBuzones() {
        setLoading(true);
        try {
            const res = await fetch("/api/buzones");
            if (res.ok) {
                const data = await res.json();
                setBuzones(data.buzones || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function toggleBuzon(email, currentStatus) {
        // Optimistic
        setBuzones((prev) =>
            prev.map((b) => (b.email === email ? { ...b, activo: !currentStatus } : b))
        );

        try {
            const res = await fetch("/api/buzones", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, activo: !currentStatus }),
            });
            if (!res.ok) throw new Error("Failed");
        } catch (e) {
            console.error(e);
            // Revert
            setBuzones((prev) =>
                prev.map((b) => (b.email === email ? { ...b, activo: currentStatus } : b))
            );
            alert("Error al actualizar estado");
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-zinc-900 border border-border">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-foreground flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-2">
                                        <EnvelopeIcon className="h-5 w-5" />
                                        Configuración de Buzones
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-4">
                                    {loading ? (
                                        <div className="py-4 text-center text-sm text-muted-foreground">
                                            Cargando buzones...
                                        </div>
                                    ) : (
                                        <div className="border rounded-md overflow-hidden">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium">Email</th>
                                                        <th className="px-4 py-2 text-right font-medium">Activo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {buzones.map((buzon) => (
                                                        <tr key={buzon.email} className="hover:bg-muted/10">
                                                            <td className="px-4 py-2">{buzon.email}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button
                                                                    onClick={() => toggleBuzon(buzon.email, buzon.activo)}
                                                                    className={`${buzon.activo ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                                                                        } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2`}
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className={`${buzon.activo ? "translate-x-4" : "translate-x-0"
                                                                            } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                                                    />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {buzones.length === 0 && (
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-4 text-center text-muted-foreground">
                                                                No se encontraron buzones
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={onClose}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
