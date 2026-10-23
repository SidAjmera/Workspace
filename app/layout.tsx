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
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <body>
        <Providers>
          <AccountProvider>
            <PracticeSyncManager />
            <Shell>{children}</Shell>
          </AccountProvider>
        </Providers>
      </body>
    </html>
  );
}
