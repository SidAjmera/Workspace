import {accountOwner} from '@/account-scope';
import {cloudSessions,saveCloudSession,cloudSession,cloudAudio,updateCloudSession,deleteCloudSession} from '@/cloud';
import {accountStorage as localStorage} from '@/account-scope';
import { Profile, Session, Analysis, defaultProfile } from "./types";
import { forgetAIConnection } from "./ai-settings";
import { exerciseKinds } from "./exercises";
const DB = "musecoach-v1";
function openDB(owner=accountOwner()): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB + ":" + owner, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("sessions", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          "Local history is unavailable. Check browser storage permissions.",
        ),
      );
    r.onblocked = () =>
      reject(new Error("Close other Musecoach tabs and retry."));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", mode);
    const request = run(tx.objectStore("sessions"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not save local history. Your browser storage may be full or disabled.",
        ),
      );
    };
    tx.onabort = tx.onerror;
  });
}
export function readProfile(): Profile | null {
  const raw = localStorage.getItem("musecoach-profile");
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p.name !== "string" || !Array.isArray(p.goals)) return null;
    const favorites = Array.isArray(p.favoriteExercises)
      ? p.favoriteExercises.filter((kind: unknown) =>
          exerciseKinds.includes(kind as (typeof exerciseKinds)[number]),
        )
      : [];
    return {
      ...defaultProfile,
      ...p,
      favoriteExercises: [...new Set(favorites)],
    };
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile) {
  localStorage.setItem("musecoach-profile", JSON.stringify(p));
}
export async function saveSession(session: Session, audio?: Blob) {
  if(session.storage==='cloud'){await saveCloudSession(session,audio);return;}
  await transaction("readwrite", (s) => s.put({...session,storage:'local',audioSaved:!!audio,audio}));
}
async function updateStoredSession(
  id: string,
  change: (record: Session & { audio?: Blob }) => Session & { audio?: Blob },
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite"),
      store = tx.objectStore("sessions");
    const request = store.get(id);
    let missing = false;
    request.onsuccess = () => {
      if (!request.result) {
        missing = true;
        tx.abort();
        return;
      }
      store.put(change(request.result));
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    const fail = () => {
      db.close();
      reject(
        new Error(
          missing
            ? "This session is no longer in your history. Reload Progress."
            : "Could not update this session. Check browser storage permissions or space.",
        ),
      );
    };
    tx.onerror = fail;
    tx.onabort = fail;
  });
}
export async function updateSessionMetadata(
  id: string,
  title: string,
  notes: string,
) {
  const clean = title.trim();
  if (!clean || clean.length > 80 || notes.length > 1000)
    throw new Error(
      "Use a session name of 1–80 characters and notes of up to 1,000 characters.",
    );
  const local=await transaction<Session|undefined>('readonly',s=>s.get(id));
  if(!local){await updateCloudSession(id,record=>({...record,title:clean,notes:notes.trim()}));return;}
  await updateStoredSession(id,record=>({...record,title:clean,notes:notes.trim()}));
}
export async function updateSessionAnalysis(id: string, analysis: Analysis) {
  const local=await transaction<Session|undefined>('readonly',s=>s.get(id));
  if(!local){await updateCloudSession(id,record=>({...record,analysis}));return;}
  await updateStoredSession(id,record=>({...record,analysis}));
}
export async function restoreSessionHistory(
  incoming: Session[],
): Promise<{ added: number; skipped: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const keys = store.getAllKeys();
    let added = 0,
      skipped = 0;
    keys.onsuccess = () => {
      const existing = new Set(keys.result);
      for (const session of incoming) {
        if (existing.has(session.id)) {
          skipped++;
          continue;
        }
        store.put({ ...session, audioSaved: false, restored: true });
        existing.add(session.id);
        added++;
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve({ added, skipped });
    };
    const fail = () => {
      db.close();
      reject(
        new Error(
          "Could not restore this history. Check browser storage permissions or available space. Existing sessions were kept.",
        ),
      );
    };
    tx.onerror = fail;
    tx.onabort = fail;
  });
}
export async function listSessions(): Promise<Session[]> {
  const records = await transaction<(Session & { audio?: Blob })[]>(
    "readonly",
    (s) => s.getAll(),
  );
  let cloud:Session[]=[];
  if(accountOwner()!=='guest'){try{cloud=await cloudSessions();}catch(e){window.dispatchEvent(new CustomEvent('workspace-cloud-error',{detail:e instanceof Error?e.message:'Cloud history is unavailable.'}));}}
  return [...records,...cloud.filter(s=>!records.some(r=>r.id===s.id)).map(s=>({...s,audio:undefined as Blob|undefined}))]
    .map(({ audio, ...session }) => {
      void audio;
      return session;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
export async function getAudio(id: string): Promise<Blob | undefined> {
  const r = await transaction<(Session & { audio?: Blob }) | undefined>(
    "readonly",
    (s) => s.get(id),
  );
  return r?.audio || (accountOwner()!=="guest"?await cloudAudio(id):undefined);
}
export async function deleteSession(id: string) {
  const local=await transaction<Session|undefined>('readonly',s=>s.get(id));
  if(!local){await deleteCloudSession(id);return;}
  await transaction("readwrite", (s) => s.delete(id));
}
export async function deleteAudio(id: string) {
  const r = await transaction<(Session & { audio?: Blob }) | undefined>(
    "readonly",
    (s) => s.get(id),
  );
  if(!r){await deleteCloudSession(id,true);return;}
  if (r) {
    delete r.audio;
    r.audioSaved = false;
    await transaction("readwrite", (s) => s.put(r));
  }
}
export async function clearData() {
  forgetAIConnection();
  await transaction("readwrite", (s) => s.clear());
  localStorage.removeItem("musecoach-profile");
  localStorage.removeItem("musecoach-chat");
  localStorage.removeItem("musecoach-designed-exercise");
  localStorage.removeItem("musecoach-song-reference");
}
/** An explicit copy into the signed-in account; never uploads or removes guest originals. */
export async function importGuestSessions(){
 const owner=accountOwner();if(owner==='guest')throw Error('Sign in before importing guest practice.');
 const guest=await openDB('guest');
 const records=await new Promise<(Session & {audio?:Blob})[]>((resolve,reject)=>{const tx=guest.transaction('sessions','readonly'),request=tx.objectStore('sessions').getAll();tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(Error('Could not read guest practice.'));});guest.close();
 if(accountOwner()!==owner)throw Error('Your account changed. Retry the import.');
 const db=await openDB(owner);
 return new Promise<{added:number;skipped:number}>((resolve,reject)=>{const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),keys=store.getAllKeys();let added=0,skipped=0;keys.onsuccess=()=>{const existing=new Set(keys.result);for(const record of records){if(existing.has(record.id)){skipped++;continue;}store.put({...record,storage:'local'});existing.add(record.id);added++;}};tx.oncomplete=()=>{db.close();resolve({added,skipped});};tx.onerror=()=>{db.close();reject(Error('Guest import failed. Existing data was kept.'));};});
}
