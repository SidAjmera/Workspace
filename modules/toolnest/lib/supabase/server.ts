import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Account services are not configured yet.');
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; Route Handlers can.
        }
      },
    },
  });
}

export async function requireUser() {
  const db = await serverClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new Error('Sign in to continue.');
  return { db, user };
}
