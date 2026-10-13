import {landmarks,links,byId} from './data.js';
function aliasIndex(text,alias){
  const escaped=alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,'u').exec(text);
  return match?.index??Infinity;
}
export function resolveLandmark(value) {
  const v = value.trim().toLowerCase();
  return landmarks.find(l=>l.id===v || l.name.toLowerCase()===v || l.aliases.includes(v));
}
export function summarize(edges) {
  const legs=[];
  for(const edge of edges){
    const last=legs.at(-1);
    if(last && last.service===edge.service && last.mode===edge.mode){last.to=edge.to;last.fare+=edge.fare;last.minutes+=edge.minutes;last.walk+=edge.walk;last.via.push(edge.to);}
    else legs.push({...edge,via:[edge.to]});
  }
  const rides=legs.filter(l=>l.mode!=='walk');
  return {legs, fare:edges.reduce((s,e)=>s+e.fare,0),minutes:edges.reduce((s,e)=>s+e.minutes,0),walk:edges.reduce((s,e)=>s+e.walk,0),transfers:Math.max(0,rides.length-1),connected:edges.every(e=>e.connected),until:Math.min(...edges.map(e=>e.until))};
}
export function findRoutes(from,to,preference='balanced') {
  if(!byId[from] || !byId[to] || from===to) return [];
  const graph={};
  for(const e of links){
    (graph[e.from]??=[]).push(e);
    (graph[e.to]??=[]).push({...e,from:e.to,to:e.from});
  }
  const results=[];
  function visit(at,path,seen){
    if(at===to){const r=summarize(path);results.push({...r,id:path.map(e=>`${e.id}-${e.from}`).join('_'),edges:path});return;}
    if(path.length>=5)return;
    for(const edge of graph[at]??[]){if(!seen.has(edge.to))visit(edge.to,[...path,edge],new Set([...seen,edge.to]));}
  }
  visit(from,[],new Set([from]));
  const score=r=>{
    if(preference==='cheapest')return r.fare*100+r.minutes+r.transfers*3;
    if(preference==='transfers')return r.transfers*1000+r.minutes+r.walk/30;
    if(preference==='walking')return r.walk*10+r.minutes+r.fare/10;
    if(preference==='late')return (r.until<22?10000:0)+(!r.connected?2000:0)+r.transfers*500+r.walk+r.minutes;
    return r.minutes+r.fare*.3+r.transfers*8+r.walk/100;
  };
  return results.sort((a,b)=>score(a)-score(b)||a.id.localeCompare(b.id)).slice(0,4);
}
export function interpret(text,currentFrom='station',currentTo='college') {
  const q=text.toLowerCase();
  const found=landmarks.map(l=>({l,index:Math.min(...[l.name,...l.aliases].map(a=>aliasIndex(q,a)))})).filter(m=>Number.isFinite(m.index)).sort((a,b)=>a.index-b.index);
  let from=currentFrom,to=currentTo;
  if(found.length>=2){from=found[0].l.id;to=found[1].l.id;}
  else if(found.length===1){if(/\bfrom\b/.test(q)&&! /\bto\b/.test(q))from=found[0].l.id;else to=found[0].l.id;}
  for(const [kind,pattern] of [['from',/\bfrom\s+(.+?)(?=\bto\b|,|$)/],['to',/\bto\s+(.+?)(?=\bfrom\b|,|$)/]]){
    const clause=q.match(pattern)?.[1];
    if(!clause)continue;
    const match=landmarks.find(l=>[l.name,...l.aliases].some(a=>Number.isFinite(aliasIndex(clause,a))));
    if(!match)return {from:currentFrom,to:currentTo,preference:'balanced',requested:[],assistance:false,recognized:false,explanation:'That landmark isn’t on our map yet.'};
    if(kind==='from')from=match.id;else to=match.id;
  }
  const requested=[];
  if(/cheap|budget|sasta|ସସ୍ତା/.test(q))requested.push('cheapest');
  if(/(?:fewer|less|no)\s+(?:changes?|transfers?)\b|\bdirect\b/.test(q))requested.push('transfers');
  if(/(?:fewer|less|little|least)\s+walk|minim.*walk/.test(q))requested.push('walking');
  if(/late|night|safe|alone|ରାତି/.test(q))requested.push('late');
  const preference=requested.includes('late')?'late':requested[0]??'balanced';
  const assistance=/missed|deviat|lost|wrong stop/.test(q);
  return {from,to,preference,requested,assistance,recognized:found.length>0||requested.length>0||assistance, explanation:assistance?'Choose your nearest landmark to find a new route.':`Using ${byId[from].short} → ${byId[to].short}. ${preference==='late'?'Looking for later services, fewer changes and shorter walks.':preference==='cheapest'?'Showing the lowest estimated fares first.':preference==='transfers'?'Showing routes with fewer changes first.':preference==='walking'?'Showing routes with less walking first.':'Balancing travel time, fare and changes.'}${requested.length>1?' We’ll prioritise late travel when requested; otherwise, we’ll use the first matching preference.':''}`};
}
export function recoveryRoutes(landmark,destination,preference){return findRoutes(landmark,destination,preference);}
