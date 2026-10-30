import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

/* ---- browser APIs jsdom does not provide ---- */
if (typeof window !== "undefined") {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

/* ---- Next.js navigation ---- */
vi.mock("next/navigation", async () => {
  const { router } = await import("./mocks");
  return {
    useRouter: () => router,
    usePathname: () => "/admin",
    useSearchParams: () => new URLSearchParams(),
    // Real redirect() throws; mimic that so server components stop rendering.
    redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); },
    notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  };
});

/* ---- toasts: spy on them instead of rendering ---- */
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}));

/* ---- framer-motion: render plain elements, no animation timing in tests ---- */
vi.mock("framer-motion", () => {
  const MOTION_PROPS = ["initial", "animate", "exit", "transition", "whileInView", "whileHover", "whileTap", "viewport", "variants", "drag", "dragConstraints", "dragElastic", "onDragEnd", "layout"];
  // One stable component per tag. (Creating a new component on every access would remount the tree on each render.)
  const cache: Record<string, unknown> = {};
  const motion = new Proxy({}, {
    get: (_t, tag: string) =>
      (cache[tag] ??= React.forwardRef<HTMLElement, Record<string, unknown>>(function MotionStub({ children, ...rest }, ref) {
        const props = Object.fromEntries(Object.entries(rest).filter(([k]) => !MOTION_PROPS.includes(k)));
        return React.createElement(tag, { ...props, ref }, children as React.ReactNode);
      })),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  };
});
