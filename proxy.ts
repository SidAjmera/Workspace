import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeSite, siteFromHost } from "./shared/site-routing";
export async function proxy(request: NextRequest) {
  const decision = routeSite(
    siteFromHost(request.headers.get("host") || request.nextUrl.host).origin,
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (decision.kind === "redirect")
    return NextResponse.redirect(decision.url!, 308);
  const requestHeaders = new Headers(request.headers);
  const respond = () =>
    decision.kind === "rewrite"
      ? NextResponse.rewrite(new URL(decision.url!, request.url), {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
  let response = respond();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = respond();
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await db.auth.getUser();
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
