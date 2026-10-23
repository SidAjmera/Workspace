'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
import {useTheme} from 'next-themes';
import {useAccount} from './auth';
export function Shell({children}:{children:React.ReactNode}){
 const path=usePathname(),{user,displayName}=useAccount();const app=path.startsWith('/toolnest')?'toolnest':path.startsWith('/musecoach')?'musecoach':'';
 const {resolvedTheme}=useTheme();
 useEffect(()=>{document.body.classList.toggle('ws-theme-dark',resolvedTheme==='dark');document.documentElement.dataset.theme=resolvedTheme||'light';},[resolvedTheme]);
 useEffect(()=>{document.body.classList.remove('toolnest-page','musecoach-page');if(app)document.body.classList.add(app+'-page');return()=>{document.body.classList.remove('toolnest-page','musecoach-page');};},[app]);
 return <><nav className="ws-bar" aria-label="Workspace navigation"><Link href="/" className="ws-wordmark">Workspace</Link><div className="ws-apps"><a href="/toolnest" aria-current={app==='toolnest'?'page':undefined}>Toolnest</a><a href="/musecoach" aria-current={app==='musecoach'?'page':undefined}>Musecoach</a></div><a href="/settings" aria-label={user?'Account & settings':'Sign in'}>{user?(displayName||'Account & settings'):'Sign in'}</a></nav>{children}</>;
}
