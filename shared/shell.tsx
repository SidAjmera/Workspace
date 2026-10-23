"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Grid2X2,
  UserRound,
  Sun,
  Moon,
} from "lucide-react";
import { useAccount } from "./auth";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { user, displayName } = useAccount();
  const app = path.startsWith("/toolnest")
    ? "toolnest"
    : path.startsWith("/musecoach")
      ? "musecoach"
      : "";
  const { resolvedTheme, setTheme } = useTheme();
  const [legacy, setLegacy] = useState(false);
  useEffect(() => {
    setLegacy(
      [
        "sidajmera-workspace.vercel.app",
        "toolnest-musecoach.vercel.app",
      ].includes(location.hostname),
    );
  }, []);
  useEffect(() => {
    document.body.classList.toggle("ws-theme-dark", resolvedTheme === "dark");
    document.documentElement.dataset.theme = resolvedTheme || "light";
  }, [resolvedTheme]);
  useEffect(() => {
    document.body.classList.remove("toolnest-page", "musecoach-page");
    if (app) document.body.classList.add(app + "-page");
    return () => {
      document.body.classList.remove("toolnest-page", "musecoach-page");
    };
  }, [app]);
  return (
    <>
      <nav className="ws-bar" aria-label="Workspace navigation">
        <Link href="/" className="ws-wordmark" aria-label="Workspace home">
          <span className="ws-brand-icon">
            <Grid2X2 size={19} />
          </span>
          <span>
            Workspace<span className="ws-brand-period">.</span>
          </span>
        </Link>
        <span className="ws-nav-divider" />
        <div className="ws-apps">
          <a
            href="/toolnest"
            aria-current={app === "toolnest" ? "page" : undefined}
          >
            <Compass size={15} />
            <span>Toolnest</span>
          </a>
          <a
            href="/musecoach"
            aria-current={app === "musecoach" ? "page" : undefined}
          >
            <AudioLines size={15} />
            <span>Musecoach</span>
          </a>
        </div>
        <button
          className="ws-theme-toggle"
          aria-label={
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <a
          className="ws-account-link"
          href="/settings"
          aria-label={user ? "Account & settings" : "Sign in"}
        >
          {user ? <UserRound size={15} /> : null}
          <span>{user ? displayName || "Your account" : "Sign in"}</span>
          <ArrowUpRight size={15} />
        </a>
      </nav>
      {legacy && (
        <aside className="ws-move-notice" aria-label="Workspace address update">
          <button
            aria-label="Dismiss address update"
            onClick={() => setLegacy(false)}
          >
            ×
          </button>
          <strong>We have a new home.</strong>
          <p>
            Device-only reviews stay with this address. Export your review
            backup and audio here before switching. Cloud data follows your
            account.
          </p>
          <a href="/musecoach/progress">Export from Progress</a>
          <a href="https://workspaceapps.vercel.app/">
            Visit the new Workspace ↗
          </a>
        </aside>
      )}
      {children}
    </>
  );
}
