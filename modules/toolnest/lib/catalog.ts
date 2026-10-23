import raw from '@toolnest/data/catalog.json';import type {App} from './types';import type {SupabaseClient} from '@supabase/supabase-js';
export const catalog=raw as App[];
export async function loadCatalog(db?:SupabaseClient,query?:string):Promise<App[]>{
 if(!db)return catalog;
 if(query?.trim()){const {data,error}=await db.rpc('search_catalog',{search_query:query});if(error)throw new Error('Catalog search is unavailable. Check the database migration.');return (data||[]).map((x:{data:App})=>x.data);}
 const {data,error}=await db.from('apps').select('data').order('name').limit(500);if(error)throw new Error('Catalog is unavailable. Check the database migration.');return (data||[]).map(x=>x.data);
}
