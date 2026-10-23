import {lookup} from 'node:dns/promises';import {isIP} from 'node:net';import https from 'node:https';
export function isPublicIP(ip:string){
 if(isIP(ip)===6){const s=ip.toLowerCase();return s.startsWith('2')||s.startsWith('3');}
 const a=ip.split('.').map(Number);return a.length===4 && a.every(x=>x>=0&&x<=255)&& ![0,10,127].includes(a[0]) && !(a[0]===169&&a[1]===254) && !(a[0]===172&&a[1]>=16&&a[1]<=31) && !(a[0]===192&&(a[1]===168||a[1]===0)) && !(a[0]===100&&a[1]>=64&&a[1]<=127) && a[0]<224 && !(a[0]===198&&(a[1]===18||a[1]===19));
}
export async function validateEndpoint(raw:string){const url=new URL(raw);const allowed=(process.env.CUSTOM_AI_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password||url.search||url.hash||!allowed.includes(url.origin))throw new Error('Custom endpoint must use an operator-approved HTTPS origin.');const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(a=>!isPublicIP(a.address)))throw new Error('Custom endpoint must resolve only to public addresses.');return {url,address:addresses[0]};}
export const safeCustomFetch:typeof fetch=async(input,init)=>{
 const raw=input instanceof Request?input.url:String(input);const {url,address}=await validateEndpoint(raw);
 return new Promise<Response>((resolve,reject)=>{
 const req=https.request(url,{method:init?.method||'POST',headers:Object.fromEntries(new Headers(init?.headers).entries()),lookup:((_host:unknown,_opts:unknown,cb:(e:null,a:string,f:number)=>void)=>cb(null,address.address,address.family)) as never},res=>{
 if((res.statusCode||0)>=300&&(res.statusCode||0)<400){res.resume();reject(new Error('Redirects are disabled.'));return;}
 const chunks:Buffer[]=[];let size=0;res.on('data',c=>{size+=c.length;if(size>2_000_000){req.destroy();reject(new Error('Response is too large.'));}else chunks.push(c);});res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode||502,headers:Object.fromEntries(Object.entries(res.headers).filter(([,v])=>typeof v==='string')) as Record<string,string>})));res.on('error',reject);
 });req.setTimeout(25000,()=>req.destroy(new Error('Provider timed out.')));req.on('error',reject);if(init?.signal)init.signal.addEventListener('abort',()=>req.destroy(new Error('Aborted')),{once:true});if(init?.body)req.write(init.body);req.end();
 });
};
