 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { PageTransition } from "@/components/page-transition";

export default function MainLayout({ children }: { children: ReactNode }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cleanupCapacitor: (() => void) | null = null;

    // Prefer native keyboard events when Capacitor is available.
    const keyboardPlugin = (window as Window & {
      Capacitor?: {
        Plugins?: {
          Keyboard?: {
            addListener?: (
              eventName: "keyboardWillShow" | "keyboardWillHide",
              callback: () => void
            ) => Promise<{ remove: () => Promise<void> }>;
          };
        };
      };
    }).Capacitor?.Plugins?.Keyboard;

    if (keyboardPlugin?.addListener) {
      let showHandle: { remove: () => Promise<void> } | null = null;
      let hideHandle: { remove: () => Promise<void> } | null = null;

      void keyboardPlugin.addListener("keyboardWillShow", () => setKeyboardOpen(true)).then((h) => {
        showHandle = h;
      });
      void keyboardPlugin.addListener("keyboardWillHide", () => setKeyboardOpen(false)).then((h) => {
        hideHandle = h;
      });

      cleanupCapacitor = () => {
        void showHandle?.remove();
        void hideHandle?.remove();
      };
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return () => {
        cleanupCapacitor?.();
      };
    }

    const updateKeyboard = () => {
      const threshold = 140;
      setKeyboardOpen(window.innerHeight - viewport.height > threshold);
    };

    updateKeyboard();
    viewport.addEventListener("resize", updateKeyboard);

    return () => {
      cleanupCapacitor?.();
      viewport.removeEventListener("resize", updateKeyboard);
    };
  }, []);

  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] ${
        keyboardOpen
          ? "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <PageTransition>{children}</PageTransition>
      <nav
        className={`vibe-card fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between px-3 py-2 transition ${
          keyboardOpen
            ? "pointer-events-none translate-y-5 opacity-0"
            : "pointer-events-auto translate-y-0 opacity-100"
        }`}
      >
        <Link
          href="/feed"
          className={`flex h-11 min-w-20 items-center justify-center rounded-xl border px-3 text-xs font-medium transition ${
            pathname === "/feed"
              ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-900/25"
              : "border-white/10 bg-slate-900/45 text-slate-100"
          }`}
        >
          Feed
        </Link>
        <Link
          href="/profile"
          className={`flex h-11 min-w-20 items-center justify-center rounded-xl border px-3 text-xs font-medium transition ${
            pathname === "/profile"
              ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-900/25"
              : "border-white/10 bg-slate-900/45 text-slate-100"
          }`}
        >
          Profile
        </Link>
        <Link
          href="/auth"
          className={`flex h-11 min-w-20 items-center justify-center rounded-xl border px-3 text-xs font-medium transition ${
            pathname === "/auth"
              ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-900/25"
              : "border-white/10 bg-slate-900/45 text-slate-100"
          }`}
        >
          Account
        </Link>
        <Link
          href="/admin"
          className={`flex h-11 min-w-20 items-center justify-center rounded-xl border px-3 text-xs font-medium transition ${
            pathname === "/admin"
              ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-900/25"
              : "border-white/10 bg-slate-900/45 text-slate-100"
          }`}
        >
          Admin
        </Link>
      </nav>
    </main>
  );
}
