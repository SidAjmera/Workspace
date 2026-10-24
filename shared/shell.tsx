"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Grid2X2,
  UserRound,
  Sun,
  Moon,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useAccount } from "./auth";
import { PreviousPracticeImport } from "./legacy-practice-ui";
import { useSite } from "./site-context";
import { appURL, workspaceOrigin, sharedPath } from "./site-routing";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { user, displayName } = useAccount();
  const site = useSite();
  const app = sharedPath(path) ? "" : site.app || "";
  const { resolvedTheme, setTheme } = useTheme();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcher = useRef<HTMLDialogElement>(null);
  const activeApp =
    app === "musecoach"
      ? {
          name: "MuseCoach",
          href: appURL("musecoach", "/", site.origin),
          icon: AudioLines,
        }
      : app === "toolnest"
        ? {
            name: "Toolnest",
            href: appURL("toolnest", "/", site.origin),
            icon: Compass,
          }
        : {
            name: "Workspace",
            href: workspaceOrigin(site.origin),
            icon: Grid2X2,
          };
  const ActiveIcon = activeApp.icon;
  useEffect(() => {
    if (switcher.current?.open) switcher.current.close();
  }, [path]);
  useEffect(() => {
    if (!switcherOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [switcherOpen]);
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
        <button
          className="ws-switcher-button"
          aria-label="All Apps"
          title="All Apps"
          aria-haspopup="dialog"
          aria-controls="ws-app-switcher"
          aria-expanded={switcherOpen}
          onClick={() => {
            switcher.current?.showModal();
            setSwitcherOpen(true);
          }}
        >
          <Menu size={21} />
        </button>
        <span className="ws-nav-divider" />
        <Link
          href={activeApp.href}
          className="ws-wordmark"
          aria-label={activeApp.name + " home"}
        >
          <span className="ws-brand-icon">
            <ActiveIcon size={19} />
          </span>
          <span>
            {activeApp.name}
            {!app && (
              <span className="ws-brand-period" aria-hidden="true">
                .
              </span>
            )}
          </span>
        </Link>
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
      <dialog
        ref={switcher}
        id="ws-app-switcher"
        className="ws-app-dialog"
        aria-labelledby="ws-switcher-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex="0"]',
            ),
          );
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => setSwitcherOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) switcher.current?.close();
        }}
      >
        <div className="ws-switcher-content">
          <div className="ws-switcher-heading">
            <span className="ws-brand-icon">
              <Grid2X2 size={20} />
            </span>
            <h2 id="ws-switcher-title">All Apps</h2>
            <button
              autoFocus
              className="ws-switcher-close"
              aria-label="Close app sidebar"
              onClick={() => switcher.current?.close()}
            >
              <X size={19} />
            </button>
          </div>
          <p className="ws-switcher-description">Choose where to go next.</p>
          <nav aria-label="All Apps">
            <a
              href={workspaceOrigin(site.origin)}
              aria-current={!app && path === "/" ? "page" : undefined}
            >
              <Grid2X2 size={20} />
              <span>
                <strong>All Apps</strong>
                <small>Explore your apps</small>
              </span>
            </a>
            {[
              {
                name: "Toolnest",
                href: appURL("toolnest", "/", site.origin),
                id: "toolnest",
                icon: Compass,
                description: "Discover and compare software",
              },
              {
                name: "MuseCoach",
                href: appURL("musecoach", "/", site.origin),
                id: "musecoach",
                icon: AudioLines,
                description: "Find your voice, build your practice",
              },
            ].map((item) => (
              <a
                key={item.id}
                href={item.href}
                aria-current={app === item.id ? "page" : undefined}
              >
                <item.icon size={20} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </span>
                {app === item.id && <Check size={17} />}
              </a>
            ))}
          </nav>
          <div className="ws-switcher-bottom">
            <a href="/settings">
              <UserRound size={17} />
              Account & settings
              <ArrowUpRight size={14} />
            </a>
            <a href={site.app ? "/account/privacy" : "/privacy"}>
              Privacy & data
            </a>
          </div>
        </div>
      </dialog>
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
          <a href="/device-export">Export previous device data</a>
          <a href="https://workspaceapps.vercel.app/">
            Visit the new Workspace ↗
          </a>
        </aside>
      )}
      {site.app === "musecoach" && (path === "/" || path === "/progress") && (
        <PreviousPracticeImport />
      )}
      {children}
    </>
  );
}
