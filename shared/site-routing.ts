export type AppId = "toolnest" | "musecoach";
export const WORKSPACE_ORIGIN = "https://workspaceapps.vercel.app";
export const APP_SITES = {
  toolnest: {
    name: "Toolnest",
    origin: "https://toolnest-discover.vercel.app",
    description: "Discover and compare software",
  },
  musecoach: {
    name: "MuseCoach",
    origin: "https://musecoach.vercel.app",
    description: "Find your voice, build your practice",
  },
} as const;
export type Site = { origin: string; app: AppId | null };
export function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}
export function siteFromHost(host: string): Site {
  if (!/^[a-z0-9.-]+(?::[0-9]+)?$/i.test(host))
    return { origin: WORKSPACE_ORIGIN, app: null };
  let parsed: URL; try { parsed = new URL("https://" + host.toLowerCase()); } catch { return { origin: WORKSPACE_ORIGIN, app: null }; }
  const local = isLocalHost(parsed.hostname);
  if (local) parsed.protocol = "http:";
  const app =
    (Object.keys(APP_SITES) as AppId[]).find(
      (id) =>
        parsed.hostname === new URL(APP_SITES[id].origin).hostname ||
        parsed.hostname === id + ".localhost",
    ) || null;
  return { origin: parsed.origin, app };
}
export function workspaceOrigin(origin: string) {
  const url = new URL(origin);
  return isLocalHost(url.hostname)
    ? url.protocol + "//workspace.localhost" + (url.port ? ":" + url.port : "")
    : WORKSPACE_ORIGIN;
}
export function appOrigin(app: AppId, origin: string) {
  const url = new URL(origin);
  return isLocalHost(url.hostname)
    ? url.protocol +
        "//" +
        app +
        ".localhost" +
        (url.port ? ":" + url.port : "")
    : APP_SITES[app].origin;
}
export function nativePath(app: AppId, path = "/") {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes(String.fromCharCode(92)) ||
    [...path].some((character) => character.charCodeAt(0) < 32)
  )
    throw Error("Invalid app path.");
  const url = new URL(path, APP_SITES[app].origin);
  const prefix = "/" + app;
  if (url.pathname === prefix) url.pathname = "/";
  else if (url.pathname.startsWith(prefix + "/"))
    url.pathname = url.pathname.slice(prefix.length);
  return url.pathname + url.search + url.hash;
}
export function appURL(app: AppId, path = "/", origin = WORKSPACE_ORIGIN) {
  return appOrigin(app, origin) + nativePath(app, path);
}
export function sharedPath(path: string) {
  return (
    ["/settings", "/device-export", "/account/privacy"].includes(path) ||
    /^\/(api|auth|_next)(\/|$)/.test(path)
  );
}
export function routeSite(
  origin: string,
  pathname: string,
  search = "",
): { kind: "redirect" | "rewrite" | "next"; url?: string } {
  const site = siteFromHost(new URL(origin).host);
  const match = pathname.match(/^\/(toolnest|musecoach)(?=\/|$)/);
  if (match)
    return {
      kind: "redirect",
      url: appURL(match[1] as AppId, pathname + search, origin),
    };
  if (
    !site.app ||
    sharedPath(pathname) ||
    pathname === "/favicon.ico" ||
    (site.app === "musecoach" && pathname === "/privacy")
  )
    return { kind: "next" };
  return {
    kind: "rewrite",
    url: "/" + site.app + (pathname === "/" ? "" : pathname) + search,
  };
}
