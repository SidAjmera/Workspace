"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useSite } from "./site-context";
import { appURL, nativePath } from "./site-routing";
export default function AppLink(props: ComponentProps<typeof Link>) {
  const site = useSite();
  let href = props.href;
  if (
    typeof href === "string" &&
    href.startsWith("/") &&
    !href.startsWith("//")
  )
    href =
      site.app === "toolnest"
        ? nativePath("toolnest", href)
        : appURL("toolnest", href, site.origin);
  return <Link {...props} href={href} />;
}
