'use client';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useTheme} from 'next-themes';
import {browserClient} from '@toolnest/lib/supabase/client';
import {setAccountOwner} from './account-scope';
import {forgetAIConnection,resetAIConnectionScope} from '@musecoach/lib/ai-settings';
type Identity={id:string;email?:string};
const Auth=createContext<{user:Identity|null;ready:boolean;displayName:string}>({user:null,ready:false,displayName:''});
export function useAccount(){return useContext(Auth);}
export function AccountProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<{user:Identity|null;ready:boolean}>({user:null,ready:false});
 const identity=useRef<string|undefined>(undefined);
 const [displayName,setDisplayName]=useState('');
 const {setTheme}=useTheme();
 useEffect(()=>{let live=true;const db=browserClient();
  const change=(user:Identity|null)=>{if(!live)return;const next=user?.id||'guest';
   if(identity.current!==next){
    if(identity.current!==undefined){
     try{forgetAIConnection();}catch{/* Memory is cleared even if browser storage is blocked. */}
     // Stop recording views and discard in-flight app state before changing local ownership.
     setState({user:null,ready:false});window.location.reload();return;
    }
    setAccountOwner(user?.id||null);resetAIConnectionScope();identity.current=next;
   }
   setState({user,ready:true});
  };
  if(!db){change(null);return;}
  const {data}=db.auth.onAuthStateChange((_event,session)=>change(session?.user||null));
  // INITIAL_SESSION from Supabase establishes the scope before any app renders.
  return()=>{live=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{let live=true;const load=()=>{if(state.user)browserClient()!.from('workspace_profiles').select('theme,display_name').eq('user_id',state.user.id).maybeSingle().then(({data})=>{if(live&&data){setTheme(data.theme);setDisplayName(data.display_name);}});};load();window.addEventListener('workspace-profile-updated',load);return()=>{live=false;window.removeEventListener('workspace-profile-updated',load);};},[state.user?.id,setTheme]);
 return <Auth.Provider value={{...state,displayName}}>{state.ready?<div key={state.user?.id||'guest'}>{children}</div>:<p role="status" className="ws-loading">Opening your workspace…</p>}</Auth.Provider>;
}
export async function signOutWorkspace(){
 const response=await fetch('/api/toolnest/ai/connection',{method:'DELETE'});
 if(!response.ok&&response.status!==401)throw Error('Could not disconnect AI. Please retry sign out.');
 forgetAIConnection();const {error}=await browserClient()!.auth.signOut();if(error)throw error;
 window.location.assign('/');
}
