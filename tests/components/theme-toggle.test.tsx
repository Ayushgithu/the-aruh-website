import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_KEY, applyTheme, themeInitScript } from "@/hooks/use-theme";

const html = document.documentElement;

beforeEach(() => {
  html.classList.remove("dark");
  html.style.colorScheme = "";
  localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="#2563EB">';
});
afterEach(() => html.classList.remove("dark"));

describe("<ThemeToggle />", () => {
  it("starts in light mode", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Toggle dark mode" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to dark: sets the class, remembers it and updates the browser colour", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(html).toHaveClass("dark");
    expect(html.style.colorScheme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#0B1220");
    expect(screen.getByRole("button", { name: "Toggle dark mode" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches back to light", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Toggle dark mode" });
    await user.click(btn);
    await user.click(btn);
    expect(html).not.toHaveClass("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#2563EB");
  });

  it("two toggles (site header + dashboard) stay in sync", async () => {
    const user = userEvent.setup();
    render(<><ThemeToggle /><ThemeToggle /></>);
    const [a, b] = screen.getAllByRole("button", { name: "Toggle dark mode" });
    await user.click(a);
    expect(b).toHaveAttribute("aria-pressed", "true");
  });

  it("applyTheme(…, false) does not overwrite the saved choice", () => {
    localStorage.setItem(THEME_KEY, "light");
    applyTheme("dark", false);
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });
});

describe("theme init script (runs before first paint, no white flash)", () => {
  const run = (prefersDark: boolean) => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: prefersDark && q.includes("dark"), media: q })) as unknown as typeof window.matchMedia;
    new Function(themeInitScript)();
    window.matchMedia = original;
  };

  it("uses the saved choice first", () => {
    localStorage.setItem(THEME_KEY, "dark");
    run(false);
    expect(html).toHaveClass("dark");
  });
  it("a saved 'light' wins over a dark device setting", () => {
    localStorage.setItem(THEME_KEY, "light");
    run(true);
    expect(html).not.toHaveClass("dark");
  });
  it("follows the device setting when nothing is saved", () => {
    run(true);
    expect(html).toHaveClass("dark");
  });
  it("stays light when the device is light and nothing is saved", () => {
    run(false);
    expect(html).not.toHaveClass("dark");
  });
});
