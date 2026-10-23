import type {Metadata} from 'next';
import {Providers} from '@toolnest/components/providers';
import {AccountProvider} from '@/auth';
import {Shell} from '@/shell';
import './workspace.css';
export const metadata:Metadata={title:'Workspace · Toolnest & Musecoach',description:'One workspace for software discovery and singing practice.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><Providers><AccountProvider><Shell>{children}</Shell></AccountProvider></Providers></body></html>;}
