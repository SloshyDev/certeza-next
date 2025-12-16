"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" disabled={pending} fullWidth>
      {pending ? "Redirigiendo..." : "Entrar con Microsoft"}
    </Button>
  );
}
