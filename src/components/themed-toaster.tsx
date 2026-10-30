"use client";
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/use-theme";

export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-center" richColors closeButton theme={theme} toastOptions={{ style: { borderRadius: 14 } }} />;
}
