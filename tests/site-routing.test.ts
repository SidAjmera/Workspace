import { describe, it, expect } from "vitest";
import {
  siteFromHost,
  routeSite,
  nativePath,
  appURL,
  workspaceOrigin,
} from "../shared/site-routing";
describe("existing app domains", () => {
  it("identifies only the owned application hosts", () => {
    expect(siteFromHost("musecoach.vercel.app").app).toBe("musecoach");
    expect(siteFromHost("toolnest-discover.vercel.app").app).toBe("toolnest");
    expect(siteFromHost("musecoach.vercel.app.evil.com").app).toBeNull();
    expect(siteFromHost("evil.com@Musecoach.vercel.app").app).toBeNull();
  });
  it("redirects old Workspace pages to native domains preserving deep links", () => {
    expect(
      routeSite(
        "https://workspaceapps.vercel.app",
        "/musecoach/session/abc",
        "?play=1",
      ),
    ).toEqual({
      kind: "redirect",
      url: "https://musecoach.vercel.app/session/abc?play=1",
    });
    expect(
      routeSite("https://workspaceapps.vercel.app", "/toolnest/apps/obsidian"),
    ).toEqual({
      kind: "redirect",
      url: "https://toolnest-discover.vercel.app/apps/obsidian",
    });
  });
  it("serves application roots and native routes from their modules", () => {
    expect(routeSite("https://musecoach.vercel.app", "/")).toEqual({
      kind: "rewrite",
      url: "/musecoach",
    });
    expect(routeSite("https://musecoach.vercel.app", "/practice")).toEqual({
      kind: "rewrite",
      url: "/musecoach/practice",
    });
    expect(
      routeSite("https://toolnest-discover.vercel.app", "/apps/obsidian"),
    ).toEqual({ kind: "rewrite", url: "/toolnest/apps/obsidian" });
  });
  it("keeps APIs, callbacks, shared settings and recovery outside app rewrites", () => {
    for (const route of [
      "/api/workspace",
      "/auth/callback",
      "/settings",
      "/device-export",
      "/account/privacy",
    ]) {
      expect(routeSite("https://musecoach.vercel.app", route).kind).toBe(
        "next",
      );
    }
  });
  it("does not serve sibling apps on another app domain", () => {
    expect(routeSite("https://musecoach.vercel.app", "/toolnest")).toEqual({
      kind: "redirect",
      url: "https://toolnest-discover.vercel.app/",
    });
  });
  it("does not confuse partial route prefixes with app routes", () => {
    expect(
      routeSite("https://workspaceapps.vercel.app", "/musecoaching").kind,
    ).toBe("next");
  });
  it("creates native URLs without exposing internal route prefixes", () => {
    expect(appURL("musecoach", "/musecoach/progress#latest")).toBe(
      "https://musecoach.vercel.app/progress#latest",
    );
    expect(nativePath("toolnest", "/apps/obsidian")).toBe("/apps/obsidian");
  });
  it("rejects protocol-relative URLs, backslashes and control characters", () => {
    for (const path of [
      "//evil.com",
      "https://evil.com",
      "/" + String.fromCharCode(92) + "evil.com",
      "/record" + String.fromCharCode(10),
    ])
      expect(() => nativePath("musecoach", path)).toThrow();
  });
  it("supports isolated local hostnames for real cross-origin browser checks", () => {
    expect(siteFromHost("musecoach.localhost:3100")).toEqual({
      origin: "http://musecoach.localhost:3100",
      app: "musecoach",
    });
    expect(appURL("musecoach", "/practice", "http://127.0.0.1:3100")).toBe(
      "http://musecoach.localhost:3100/practice",
    );
    expect(workspaceOrigin("http://toolnest.localhost:3100")).toBe(
      "http://workspace.localhost:3100",
    );
  });
});
