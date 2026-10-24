"use client";
import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  APP_SITES,
  appURL,
  nativePath,
  WORKSPACE_ORIGIN,
  type AppId,
  type Site,
} from "./site-routing";
const SiteContext = createContext<Site>({
  origin: WORKSPACE_ORIGIN,
  app: null,
});
export function SiteProvider({
  site,
  children,
}: {
  site: Site;
  children: ReactNode;
}) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}
export function useSite() {
  return useContext(SiteContext);
}
export function AppDestinationLink({
  app,
  path = "/",
  ...props
}: Omit<ComponentProps<"a">, "href"> & { app: AppId; path?: string }) {
  const site = useSite();
  return (
    <a
      {...props}
      href={
        site.app === app
          ? nativePath(app, path)
          : appURL(app, path, site.origin)
      }
    />
  );
}
export { APP_SITES };
