"use client";
import * as React from "react";

/* Google Identity Services: Google draws the button and hands us a signed ID token, which /api/auth/google verifies. */
interface GsiApi {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; use_fedcm_for_prompt?: boolean }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
}
declare global { interface Window { google?: GsiApi } }

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const googleEnabled = GOOGLE_CLIENT_ID.length > 0;

let scriptPromise: Promise<void> | null = null;
let initialised = false;
let handler: ((credential: string) => void) | null = null; // whichever button is mounted right now

function loadGsi() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Could not load Google sign-in")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function GoogleButton({ text, onCredential }: { text: "signin_with" | "signup_with" | "continue_with"; onCredential: (credential: string) => void }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    handler = onCredential;
    return () => { if (handler === onCredential) handler = null; };
  }, [onCredential]);

  React.useEffect(() => {
    if (!googleEnabled) return;
    let alive = true;
    loadGsi().then(() => {
      if (!alive || !box.current || !window.google) return;
      if (!initialised) {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => { if (r.credential) handler?.(r.credential); } });
        initialised = true;
      }
      box.current.innerHTML = "";
      window.google.accounts.id.renderButton(box.current, {
        type: "standard", theme: "outline", size: "large", shape: "rectangular", logo_alignment: "left", text,
        width: Math.max(200, Math.min(400, box.current.clientWidth || 320)),
      });
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [text]);

  if (!googleEnabled || failed) return null;
  return <div ref={box} className="flex min-h-[44px] justify-center" aria-label="Continue with Google" />;
}
