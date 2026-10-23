import type {App, Profile, Requirements, Ranked, Support} from './types';
import {defaultProfile} from './types';
const value = (s:Support|undefined) => s === 'supported' ? 1 : 0;
export function rank(app:App, r:Requirements, profile:Profile = defaultProfile):Ranked {
 const reasons:string[] = [], unknowns:string[] = [];
 let eligible = app.id !== r.excludeId;
 const mandatory = (label:string,s:Support|undefined) => {
  if (s === 'unsupported') { eligible=false; reasons.push('Does not meet required '+label); }
  if (!s || s==='unknown') unknowns.push('Required '+label+' is unverified');
 };
 if(r.platform && r.platformMandatory) mandatory(r.platform,app.platforms[r.platform]);
 if(r.priceMandatory && r.maxPrice!==undefined) mandatory('budget',app.price===null?'unknown':app.price<=r.maxPrice?'supported':'unsupported');
 r.requiredFeatures.forEach(f=>mandatory(f,app.features[f]));
 const requested=[...new Set([...r.requiredFeatures,...r.preferredFeatures])];
 let known=0,total=0;
 const measure=(s:Support|undefined,label:string) => {total++;if(s && s!=='unknown')known++;else unknowns.push(label+' is unverified');return value(s);};
 const features=requested.length?requested.reduce((n,f)=>n+measure(app.features[f],f),0)/requested.length:0.5;
 const preferenceFeatures = (r.priorities?.length?r.priorities:profile.priorities).flatMap(p=>({Privacy:['local-storage','encryption'],Integrations:['integrations'],Customizability:['customization'],Features:['collaboration','sync'],Performance:['offline']}[p]||[]));
 const preferredPlatforms=r.platform?[r.platform]:profile.platforms;
 const prefValues=[...preferenceFeatures.map(f=>measure(app.features[f],f)),...preferredPlatforms.map(p=>measure(app.platforms[p],p))];
 const preferences=prefValues.length?prefValues.reduce<number>((a,b)=>a+b,0)/prefValues.length:0.5;
 const max=r.maxPrice??(profile.budget==='free'?0:profile.budget==='under10'?10:Infinity);
 const pricing=max===Infinity?0.5:measure(app.price===null?'unknown':app.price<=max?'supported':'unsupported','Pricing');
 const ease=app.ease??0.5;
 const privacyItems=['local-storage','encryption','integrations'];
 const privacy=privacyItems.reduce((n,f)=>n+measure(app.features[f],f),0)/privacyItems.length;
 const weights={features:40,preferences:25,pricing:15,ease:10,privacy:10};
 const priorities=r.priorities?.length?r.priorities:profile.priorities;
 if(priorities.includes('Privacy'))weights.privacy+=20;
 if(priorities.includes('Ease of use'))weights.ease+=20;
 if(priorities.includes('Features'))weights.features+=20;
 if(priorities.includes('Integrations'))weights.privacy+=15;
 const factors={features,preferences,pricing,ease,privacy};
 const weightSum=Object.values(weights).reduce((a,b)=>a+b,0);
 const breakdown=Object.fromEntries(Object.entries(factors).map(([k,v])=>[k,Math.round(v*weights[k as keyof typeof weights]/weightSum*1000)/10]));
 const score=Math.round(Object.values(breakdown).reduce((a,b)=>a+b,0));
 requested.filter(f=>app.features[f]==='supported').forEach(f=>reasons.push('Verified '+f.replaceAll('-',' ')+' support'));
 if(r.platform && app.platforms[r.platform]==='supported')reasons.push('Available on '+r.platform);
 if(max!==Infinity && app.price!==null && app.price<=max)reasons.push('Fits your budget');
 if(!reasons.length)reasons.push(requested.length?'Limited verified evidence for these requirements':'Explore this app; add preferences for a more meaningful match');
 return {app,score,confidence:total?Math.round(known/total*100):0,eligible,reasons,unknowns:[...new Set(unknowns)],breakdown};
}
export function retrieve(apps:App[],r:Requirements):App[] {
 const q=r.query.toLowerCase().trim();
 if(!q && !r.category)return apps;
 const tokens=q.split(/[^a-z0-9-]+/).filter(w=>w.length>1&&!['want','with','that','have','need','app','apps','software','free','best','something','for','the','and','but','use'].includes(w));
 return apps.map(app=>{
  const hay=[app.name,app.category,app.description,...app.keywords,...Object.keys(app.features)].join(' ').toLowerCase();
  let relevance = tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
  if(r.category && app.category.toLowerCase()===r.category.toLowerCase())relevance+=5;
  if(q===app.name.toLowerCase())relevance+=20;
  return {app,relevance};
 }).filter(x=>x.relevance>0).sort((a,b)=>b.relevance-a.relevance).map(x=>x.app);
}
export function recommend(apps:App[],r:Requirements,p:Profile=defaultProfile) {
 return retrieve(apps,r).map(a=>rank(a,r,p)).filter(a=>a.eligible).sort((a,b)=>b.score-a.score||b.confidence-a.confidence);
}
