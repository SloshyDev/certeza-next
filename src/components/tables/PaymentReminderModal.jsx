"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function PaymentReminderModal({ isOpen, onClose, policyData, daysData, type }) { // type: 'overdue' | 'remaining'
    const [recipientOption, setRecipientOption] = useState("advisor");
    const [customEmail, setCustomEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && policyData) {
            // Logic to determine template
            const isOverdue = type === "overdue"; // daysData < 0
            const days = Math.abs(daysData);

            const subjectText = isOverdue
                ? `Aviso de Pago Vencido - Póliza ${policyData.no_poliza}`
                : `Recordatorio de Pago Próximo - Póliza ${policyData.no_poliza}`;

            setSubject(subjectText);

            // Template generation with HTML line breaks
            const template = `
<p>Estimado Asesor,</p>

<p>Le informamos sobre el estatus de cobranza de la siguiente póliza bajo su seguimiento:</p>

<ul>
  <li><strong>Póliza:</strong> ${policyData.no_poliza}</li>
  <li><strong>Folio:</strong> ${policyData.folio || "N/A"}</li>
  <li><strong>Compañía:</strong> ${policyData.cia}</li>
</ul>

<p>
  ${isOverdue
                    ? `Esta póliza presenta un atraso de <strong>${days} días</strong> en su pago.`
                    : `Le recordamos que el próximo pago de esta póliza vence en <strong>${days} días</strong>.`
                }
</p>

<p>Le agradecemos dar seguimiento oportuno con su cliente para asegurar la continuidad de la cobertura.</p>

<p>Atentamente,<br>
Departamento de Cobranza<br>
Certeza</p>
      `;

            setBody(template.trim());
            setRecipientOption("advisor");
            setCustomEmail("");
        }
    }, [isOpen, policyData, daysData, type]);

    const handleSend = async () => {
        const to = recipientOption === "advisor" ? policyData.asesor_email : customEmail; // Assuming advisor_email is available, if not need to ask user or custom.
        // Wait, policyData might not have specific email if not joined. But assuming we can fallback to custom if needed.
        // Actually RecibosTable data might not have advisor email. Let's check RecibosTable data structure.
        // It has `asesor_nombre`. If no email, force custom.

        if (!to) {
            alert("Por favor ingrese un correo destinatario valid.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    subject,
                    htmlBody: body,
                }),
            });

            if (res.ok) {
                alert("Correo enviado exitosamente.");
                onClose();
            } else {
                const err = await res.json();
                alert("Error al enviar correo: " + (err.error || "Desconocido"));
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    // Check if we have advisor email. If not, default to custom/advisor lookup isn't really doable without more data.
    // Assuming for now we might need to ask user manually or use a specific email field if available.
    // The user prompt said: "dame a elejir si usar el correo del asesor o escriibir otro correo."
    // I'll assume I might need to fetch it or just let them input.
    // If `policyData.asesor_email` is missing, I'll disable that option or prompt.

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="max-w-2xl w-full bg-background border border-border rounded-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
                    <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    <DialogTitle className="text-xl font-bold mb-4">Enviar Aviso de Pago</DialogTitle>

                    <div className="space-y-4">
                        {/* Recipient Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Destinatario</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="recipient"
                                        value="advisor"
                                        checked={recipientOption === "advisor"}
                                        onChange={() => setRecipientOption("advisor")}
                                        disabled={!policyData?.asesor_email}
                                        className="accent-primary"
                                    />
                                    <span>Correo del Asesor ({policyData?.asesor_email || "No disponible"})</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="recipient"
                                        value="custom"
                                        checked={recipientOption === "custom"}
                                        onChange={() => setRecipientOption("custom")}
                                        className="accent-primary"
                                    />
                                    <span>Otro correo</span>
                                </label>
                            </div>
                            {recipientOption === "custom" && (
                                <input
                                    type="email"
                                    value={customEmail}
                                    onChange={(e) => setCustomEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full px-3 py-2 border border-border rounded-md mt-2"
                                />
                            )}
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Asunto</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-md"
                            />
                        </div>

                        {/* Body */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mensaje (HTML)</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2 border border-border rounded-md font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Puede editar el contenido HTML directamente.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={onClose} className="btn-secondary">Cancelar</button>
                            <button
                                onClick={handleSend}
                                disabled={loading}
                                className="btn-primary flex items-center gap-2"
                            >
                                {loading ? "Enviando..." : (
                                    <>
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                        Enviar Correo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
