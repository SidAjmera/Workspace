import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';import {cookies} from 'next/headers';import type {Connection} from './providers';
const name='toolnest-ai';
function secret(){const key=Buffer.from(process.env.BYOK_SESSION_SECRET||'','base64');if(key.length!==32)throw new Error('AI session security is not configured.');return key;}
export function seal(value:unknown){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function unseal(token:string){const data=Buffer.from(token,'base64url'),dec=createDecipheriv('aes-256-gcm',secret(),data.subarray(0,12));dec.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([dec.update(data.subarray(28)),dec.final()]).toString());}
export async function saveConnection(c:Connection,uid:string){(await cookies()).set(name,seal({...c,uid,expires:Date.now()+2*60*60*1000}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/toolnest/ai'});}
export async function readConnection(uid:string):Promise<Connection|null>{const token=(await cookies()).get(name)?.value;if(!token)return null;try{const c=unseal(token);return c.uid===uid&&c.expires>Date.now()?c:null;}catch{return null;}}
export async function disconnect(){(await cookies()).set(name,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/toolnest/ai',maxAge:0});}
