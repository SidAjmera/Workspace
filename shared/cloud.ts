import {browserClient} from '@toolnest/lib/supabase/client';
import {accountOwner} from './account-scope';
import type {Session} from '@musecoach/lib/types';
export const AUDIO_BUCKET='musecoach-recordings';
export async function cloudClient(){
 const owner=accountOwner(),db=browserClient();
 if(!db||owner==='guest')throw Error('Sign in to your workspace to use cloud storage.');
 const {data,error}=await db.auth.getUser();
 if(error||data.user?.id!==owner||accountOwner()!==owner)throw Error('Your account changed. Please retry.');
 return {db,owner};
}
function checked(error:{message:string}|null){if(error)throw Error('Cloud storage: '+error.message);}
export async function cloudSessions():Promise<Session[]>{
 const {db,owner}=await cloudClient();let rows:Session[]=[];
 for(let offset=0;;offset+=100){const {data,error}=await db.from('musecoach_sessions').select('data,audio_path').eq('user_id',owner).order('id').range(offset,offset+99);checked(error);rows.push(...(data||[]).map(row=>({...row.data,audioSaved:!!row.audio_path,storage:'cloud' as const})));if(!data||data.length<100)break;}
 if(accountOwner()!==owner)throw Error('Your account changed. Please retry.');return rows;
}
export async function saveCloudSession(session:Session,audio?:Blob){
 const {db,owner}=await cloudClient();
 if(!/^[a-zA-Z0-9-]{1,100}$/.test(session.id))throw Error('Invalid session identifier.');
 if(audio&&(!audio.type.startsWith('audio/')||audio.size>20*1024*1024))throw Error('Cloud audio must be an audio file of at most 20 MB.');
 const path=audio?`${owner}/${session.id}-${crypto.randomUUID()}`:null;
 if(path&&audio){const {error}=await db.storage.from(AUDIO_BUCKET).upload(path,audio,{contentType:audio.type.split(';')[0],upsert:false});checked(error);}
 if(accountOwner()!==owner){if(path)await db.storage.from(AUDIO_BUCKET).remove([path]);throw Error('Your account changed. This take was not saved.');}
 const {error}=await db.from('musecoach_sessions').insert({user_id:owner,id:session.id,data:{...session,storage:'cloud',audioSaved:!!path},audio_path:path});
 if(error){if(path)await db.storage.from(AUDIO_BUCKET).remove([path]);checked(error);}
}
export async function cloudSession(id:string){const {db,owner}=await cloudClient();const {data,error}=await db.from('musecoach_sessions').select('data,audio_path').eq('user_id',owner).eq('id',id).maybeSingle();checked(error);return {db,owner,row:data};}
export async function cloudAudio(id:string){const {db,row,owner}=await cloudSession(id);if(!row?.audio_path)return;const {data,error}=await db.storage.from(AUDIO_BUCKET).download(row.audio_path);checked(error);if(accountOwner()!==owner)throw Error('Your account changed.');return data||undefined;}
export async function updateCloudSession(id:string,change:(session:Session)=>Session){const {db,owner,row}=await cloudSession(id);if(!row)throw Error('Session no longer exists.');const {error}=await db.from('musecoach_sessions').update({data:change({...row.data,storage:'cloud',audioSaved:!!row.audio_path})}).eq('user_id',owner).eq('id',id);checked(error);}
export async function deleteCloudSession(id:string,audioOnly=false){
 const {db,owner,row}=await cloudSession(id);if(!row)return;
 if(row.audio_path){const {error}=await db.storage.from(AUDIO_BUCKET).remove([row.audio_path]);checked(error);}
 const query=audioOnly?db.from('musecoach_sessions').update({audio_path:null,data:{...row.data,audioSaved:false}}):db.from('musecoach_sessions').delete();
 const {error}=await query.eq('user_id',owner).eq('id',id);checked(error);
}
