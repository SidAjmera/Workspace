"use client";
import {
  useRouter as nextRouter,
  usePathname as nextPathname,
} from "next/navigation";
import { useSite } from "./site-context";
import { nativePath, appURL } from "./site-routing";
export function usePathname() {
  return nextPathname().replace(/^\/musecoach(?=\/|$)/, "") || "/";
}
export function useRouter() {
  const router = nextRouter(),
    site = useSite();
  const destination = (href: string) =>
    site.app === "musecoach"
      ? nativePath("musecoach", href)
      : appURL("musecoach", href, site.origin);
  return {
    ...router,
    push: (href: string, options?: { scroll?: boolean }) =>
      router.push(destination(href), options),
    replace: (href: string) => router.replace(destination(href)),
  };
}
