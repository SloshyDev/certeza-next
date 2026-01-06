"use client";

import { useState, useEffect, useRef } from "react";
import { UserCircleIcon, ArrowRightStartOnRectangleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import BuzonesConfigModal from "./BuzonesConfigModal";

export default function UserMenu({ user, onSignOut }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dbUser, setDbUser] = useState(null); // { found: bool, user: obj }
    const [isBuzonesModalOpen, setIsBuzonesModalOpen] = useState(false);
    const menuRef = useRef(null);

    // Permission check
    const canConfigureBuzones = user?.roles?.some(r => ["admin", "emisor", "coordinador", "supervisor_emi"].includes(r));

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch DB status on mount or when menu opens
    useEffect(() => {
        if (isOpen && !dbUser) {
            setLoading(true);
            fetch("/api/user/status")
                .then((res) => res.json())
                .then((data) => {
                    setDbUser(data);
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, dbUser]);

    async function toggleStatus() {
        if (!dbUser?.found) return;
        const currentStatus = dbUser.user.status;
        const nextStatus = !currentStatus;

        // Optimistic update
        setDbUser(prev => ({ ...prev, user: { ...prev.user, status: nextStatus } }));

        try {
            const res = await fetch("/api/user/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (!res.ok) throw new Error("Failed to update");
            const json = await res.json();
            setDbUser({ found: true, user: json.user });
        } catch (e) {
            console.error(e);
            // Revert on error
            setDbUser(prev => ({ ...prev, user: { ...prev.user, status: currentStatus } }));
        }
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary gap-2 flex items-center"
                aria-label="Menú de usuario"
            >
                <UserCircleIcon className="h-5 w-5" />
                <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                    {user?.name || user?.email?.split("@")[0] || "Usuario"}
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-md bg-background border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-4">
                    <div className="mb-4">
                        <p className="text-sm font-semibold text-foreground">
                            {user?.name || "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                        </p>
                    </div>

                    <hr className="border-border my-2" />

                    {loading ? (
                        <p className="text-xs py-2 opacity-50">Cargando estado...</p>
                    ) : dbUser?.found ? (
                        <div className="py-2 flex items-center justify-between">
                            <div className="text-sm">
                                <p className="font-medium text-foreground">Asignación</p>
                                <p className="text-xs text-muted-foreground">
                                    {dbUser.user.status ? "Activo" : "Inactivo"}
                                </p>
                            </div>
                            <button
                                onClick={toggleStatus}
                                className={`${dbUser.user.status ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2`}
                                role="switch"
                                aria-checked={dbUser.user.status}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`${dbUser.user.status ? "translate-x-5" : "translate-x-0"
                                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                />
                            </button>
                        </div>
                    ) : (
                        ''
                    )}

                    {canConfigureBuzones && (
                        <>
                            <hr className="border-border my-2" />
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsBuzonesModalOpen(true);
                                }}
                                className="w-full text-left flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                            >
                                <EnvelopeIcon className="h-4 w-4" />
                                Configurar Buzones
                            </button>
                        </>
                    )}

                    <hr className="border-border my-2" />

                    <button
                        onClick={() => onSignOut && onSignOut()}
                        className="w-full text-left flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-muted rounded-md transition-colors"
                    >
                        <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            )}

            <BuzonesConfigModal
                isOpen={isBuzonesModalOpen}
                onClose={() => setIsBuzonesModalOpen(false)}
            />
        </div>
    );
}
