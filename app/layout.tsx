import { headers } from "next/headers";
import { SiteProvider } from "@/site-context";
import { siteFromHost } from "@/site-routing";
import type { Metadata } from "next";
import { Providers } from "@toolnest/components/providers";
import { AccountProvider } from "@/auth";
import { Shell } from "@/shell";
import { PracticeSyncManager } from "@/practice-sync-ui";
import "./workspace.css";
export const metadata: Metadata = {
  title: "Workspace · Your apps, together",
  description: "One workspace for software discovery and singing practice.",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = siteFromHost(
    (await headers()).get("host") || "workspaceapps.vercel.app",
  );
  return (
    <html lang="en-US" suppressHydrationWarning>
      <body>
        <SiteProvider site={site}>
          <Providers>
            <AccountProvider>
              <PracticeSyncManager />
              <Shell>{children}</Shell>
            </AccountProvider>
          </Providers>
        </SiteProvider>
      </body>
    </html>
  );
}
