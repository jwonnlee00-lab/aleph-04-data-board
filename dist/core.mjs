export const API = 'https://api.frankfurter.dev/v2/providers/ecb/rate/USD/KRW';
export const kstDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function validate(data, now = new Date(), last = null) {
  if (!data || data.base !== 'USD' || data.quote !== 'KRW' || typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) throw new Error('invalid');
  const date = Date.parse(data.date + 'T00:00:00Z');
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0,10)!==data.date) throw new Error('invalid');
  const age = (Date.parse(kstDate(now)+'T00:00:00Z')-date)/86400000;
  if(age < 0 || age > 5 || (last && data.date < last.date)) throw new Error('stale');
  return data;
}
export async function receive(fetcher = fetch, mode = 'live', now = new Date(), last = null, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    let response;
    if(mode==='network') throw new TypeError('synthetic network');
    if(mode==='timeout') {
      await new Promise((_, reject)=>{controller.signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true});});
    } else if(mode==='http') response = new Response('{}',{status:503});
    else if(mode==='invalid') response = new Response('{"base":"USD","quote":"KRW","date":"2026-10-13","rate":"oops"}');
    else if(mode==='stale') response = new Response('{"base":"USD","quote":"KRW","date":"2000-01-01","rate":1200}');
    else response = await fetcher(API,{signal:controller.signal,cache:'no-store'});
    if(!response.ok) throw new Error('http');
    let data;
    try {data = await response.json();} catch {throw new Error('invalid');}
    return {ok:true,data:validate(data,now,last)};
  } catch(error) {
    return {ok:false,reason:controller.signal.aborted ? 'timeout' : ['http','invalid','stale','timeout'].includes(error.message) ? error.message : 'network'};
  } finally {clearTimeout(timer);}
}
export function compare(records, today = kstDate()) {
  const a=records.find(r=>r.kstDate===today);
  const yesterday=new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const b=records.find(r=>r.kstDate===yesterday);
  return a && b ? {delta:a.value.rate-b.value.rate,percent:(a.value.rate/b.value.rate-1)*100,today:a,yesterday:b} : null;
}
