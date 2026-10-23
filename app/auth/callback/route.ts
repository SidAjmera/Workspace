import {NextResponse} from 'next/server';
import {serverClient} from '@toolnest/lib/supabase/server';
export async function GET(req:Request){const url=new URL(req.url),code=url.searchParams.get('code');if(code){const db=await serverClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/settings',url.origin));}return NextResponse.redirect(new URL('/settings?authError=1',url.origin));}
