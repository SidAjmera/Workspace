import {NextResponse} from 'next/server';
import {requireUser} from '@toolnest/lib/supabase/server';
import {body,errorResponse} from '@toolnest/lib/http';
import {z} from 'zod';
export async function GET(){try{
 const {db,user}=await requireUser();const result:Record<string,unknown>={account:{id:user.id,email:user.email},exportedAt:new Date().toISOString(),audioIncluded:false,audioDownload:'Download original recordings individually from Musecoach Progress.'};
 for(const table of ['workspace_profiles','user_profiles','user_preferences','consent_records','saved_apps','search_history','app_suggestions','deletion_requests','ai_usage','musecoach_sessions']){
  const rows:unknown[]=[];for(let offset=0;;offset+=100){const {data,error}=await db.from(table).select('*').eq('user_id',user.id).order(table==='musecoach_sessions'?'id':'user_id').range(offset,offset+99);if(error)throw Error('Unable to export all workspace data.');rows.push(...(data||[]));if(!data||data.length<100)break;}result[table]=rows;
 }
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e);}}
export async function PUT(req:Request){try{
 const {db,user}=await requireUser();const input=z.object({display_name:z.string().trim().max(80),theme:z.enum(['light','dark','system'])}).parse(await body(req));
 const {error}=await db.from('workspace_profiles').upsert({user_id:user.id,...input});if(error)throw Error('Unable to save workspace settings.');return NextResponse.json({ok:true});
}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try{
 const {db,user}=await requireUser();const input=z.object({scope:z.enum(['toolnest','musecoach','workspace']),confirm:z.string()}).parse(await body(req));
 if(input.confirm!==`DELETE ${input.scope.toUpperCase()}`)throw Error('The confirmation does not match.');
 if(input.scope!=='toolnest'){
  // Remove files through Storage API; deleting storage.objects in SQL would leave file bytes behind.
  for(;;){const {data,error}=await db.storage.from('musecoach-recordings').list(user.id,{limit:100});if(error)throw Error('Could not list cloud recordings. No account deletion was requested.');if(!data?.length)break;const {error:removeError}=await db.storage.from('musecoach-recordings').remove(data.map(file=>user.id+'/'+file.name));if(removeError)throw Error('Could not delete cloud recordings. Please retry.');}
 }
 const {error}=await db.rpc('clear_workspace_app',{target:input.scope});if(error)throw Error('Unable to delete workspace data. Please retry.');
 if(input.scope==='workspace'){
  // Keep the identity queued for the operator after file cleanup; this never claims immediate account deletion.
  const {error:requestError}=await db.rpc('request_data_deletion');if(requestError)throw Error('Data removed, but account deletion could not be queued. Please retry.');
 }
 return NextResponse.json({ok:true,queued:input.scope==='workspace',message:input.scope==='workspace'?'Cloud app data removed. Account deletion is queued for the operator.':`${input.scope==='toolnest'?'Toolnest':'Musecoach'} cloud data deleted. Your workspace account is kept.`});
}catch(e){return errorResponse(e);}}
