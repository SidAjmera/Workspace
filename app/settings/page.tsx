"use client";
import { PreviousPracticeImport } from "@/legacy-practice-ui";
import { AppDestinationLink } from "@/site-context";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { browserClient, configured } from "@toolnest/lib/supabase/client";
import { useAccount, signOutWorkspace } from "@/auth";
import { clearData, importGuestSessions } from "@musecoach/lib/storage";
import { clearAccountLocalData } from "@/account-scope";
import { PracticeSyncSettings } from "@/practice-sync-ui";
export default function Settings() {
  const { user } = useAccount(),
    { theme, setTheme } = useTheme();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [name, setName] = useState(""),
    [confirm, setConfirm] = useState(""),
    [scope, setScope] = useState<"toolnest" | "musecoach" | "workspace">(
      "toolnest",
    );
  useEffect(() => {
    let live = true;
    if (user)
      browserClient()!
        .from("workspace_profiles")
        .select("display_name,theme")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!live) return;
          if (error)
            setMessage(
              "Workspace settings are unavailable. The database migration may still be needed.",
            );
          else if (data) {
            setName(data.display_name);
            setTheme(data.theme);
          }
        });
    return () => {
      live = false;
    };
  }, [user?.id, setTheme]);
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to complete request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function api(method: string, data?: unknown) {
    const response = await fetch("/api/workspace", {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Request failed.");
    return result;
  }
  return (
    <main className="ws-settings">
      <span className="ws-kicker">ONE ACCOUNT · ALL APPS</span>
      <h1>Account & settings</h1>
      <p>
        All Apps share your account. App preferences and saved content remain
        separate.
      </p>
      <PreviousPracticeImport always />
      {message && (
        <p role="status" className="ws-feedback">
          {message}
        </p>
      )}
      {!user ? (
        <section>
          <h2>{signup ? "Create your workspace" : "Welcome back"}</h2>
          {!configured && (
            <p>
              Account services need Supabase configuration. Guest browsing and
              local practice remain available.
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void work(async () => {
                const db = browserClient();
                if (!db) throw Error("Account services are not configured.");
                const { data, error } = signup
                  ? await db.auth.signUp({
                      email,
                      password,
                      options: {
                        emailRedirectTo: location.origin + "/auth/callback",
                      },
                    })
                  : await db.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setPassword("");
                if (!data.session)
                  setMessage(
                    "Check your email to confirm your workspace account.",
                  );
              });
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button disabled={busy || !configured}>
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
          </form>
          <button disabled={busy} onClick={() => setSignup(!signup)}>
            {signup ? "Use an existing account" : "Create a new account"}
          </button>
        </section>
      ) : (
        <>
          <section>
            <h2>Your workspace</h2>
            <p>Signed in as {user.email}</p>
            <label>
              Display name
              <input
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Appearance
              <select
                value={theme || "system"}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button
              disabled={busy}
              onClick={() =>
                void work(async () => {
                  await api("PUT", {
                    display_name: name,
                    theme: theme || "system",
                  });
                  window.dispatchEvent(new Event("workspace-profile-updated"));
                  setMessage("Workspace settings saved.");
                })
              }
            >
              Save settings
            </button>
            <button disabled={busy} onClick={() => void work(signOutWorkspace)}>
              Sign out of workspace
            </button>
          </section>
          <PracticeSyncSettings />
          <section>
            <h2>Your recordings, your choice</h2>
            <p>
              Each take offers measurements only, device audio, a cloud review
              without audio, or private cloud audio. Cloud reviews are available
              on other devices when you sign in. Device audio is separated by
              account.
            </p>
            <p>
              Open any saved review to copy or move its recording between device
              and cloud storage. Copy keeps both locations. Move saves the
              destination before removing the source audio. Review sync never
              uploads device audio.
            </p>
            <AppDestinationLink
              className="ws-action"
              app="musecoach"
              path="/record"
            >
              Record a take
            </AppDestinationLink>
          </section>
          <section>
            <h2>Import guest practice</h2>
            <p>
              Copy guest sessions and saved audio from this workspace’s browser
              into your signed-in device history. This does not upload audio or
              replace existing takes. For the original Musecoach website,
              download a review backup there and restore it in Progress here;
              download and re-upload recordings separately.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void work(async () => {
                  const result = await importGuestSessions();
                  setMessage(
                    `Imported ${result.added} guest sessions; skipped ${result.skipped} existing sessions. Recordings remain on this device.`,
                  );
                })
              }
            >
              Import guest sessions from this browser
            </button>
          </section>
          <section>
            <h2>Export your data</h2>
            <p>
              Download account settings and cloud records from All Apps. Export
              local Musecoach reviews from Progress. Download original audio
              individually from each saved review.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void work(async () => {
                  const result = await api("GET");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(result, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "workspace-data.json";
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                })
              }
            >
              Download workspace data
            </button>
          </section>
          <section>
            <h2>Delete data</h2>
            <p>
              App deletion keeps your shared account. Workspace deletion removes
              cloud data from All Apps and submits an account deletion request
              for the operator. Device data on other browsers must be cleared on
              those devices.
            </p>
            <label>
              What to delete
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as typeof scope);
                  setConfirm("");
                }}
              >
                <option value="toolnest">Toolnest data</option>
                <option value="musecoach">Musecoach data and recordings</option>
                <option value="workspace">Entire workspace account</option>
              </select>
            </label>
            <label>
              Type DELETE {scope.toUpperCase()}
              <input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              className="ws-danger"
              disabled={busy || confirm !== `DELETE ${scope.toUpperCase()}`}
              onClick={() =>
                void work(async () => {
                  const result = await api("DELETE", { scope, confirm });
                  if (scope !== "toolnest") await clearData();
                  if (scope === "workspace") {
                    clearAccountLocalData();
                    setMessage(result.message);
                    await signOutWorkspace();
                  } else {
                    setConfirm("");
                    setMessage(result.message);
                  }
                })
              }
            >
              Delete selected data
            </button>
          </section>
        </>
      )}
      {!user && (
        <section>
          <h2>Guest practice</h2>
          <p>
            You can explore All Apps and practice without an account. Sign in
            when you want private cloud recordings.
          </p>
          <AppDestinationLink className="ws-action" app="musecoach">
            Open Musecoach
          </AppDestinationLink>
          <AppDestinationLink className="ws-action" app="toolnest">
            Open Toolnest
          </AppDestinationLink>
        </section>
      )}
      <p>
        <a href="/privacy">Workspace privacy and storage details</a>
      </p>
    </main>
  );
}
