import {kstDate,hundredYen,compare} from './core.mjs';
const $=id=>document.getElementById(id);
const fmt=value=>value.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
async function show(){
 const response=await fetch('./card-5-records.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error();
 const data=await response.json(),records=data.records;
 if(data.synthetic!==false||records.length!==2||new Set(records.map(r=>kstDate(new Date(r.collectedAt)))).size!==2)throw Error();
 for(const record of records){
  if(JSON.stringify(JSON.parse(record.rawResponse))!==JSON.stringify(record.value)||record.normalized_reading.normalized_value!==hundredYen(record.value.rate))throw Error();
  const tr=document.createElement('tr');
  const values=[record.kstDate,new Date(record.collectedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' KST',record.value.date+' · 정확한 발표 시각 미제공',record.value.rate+' 원/1엔',fmt(record.normalized_reading.normalized_value)+' 원/100엔'];
  for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const td=document.createElement('td'),a=document.createElement('a');a.href=record.source;a.textContent='Frankfurter / ECB · 원천';a.target='_blank';a.rel='noopener';td.append(a);tr.append(td);$('two-days-rows').append(tr);
 }
 const result=compare(records,records[1].kstDate);
 if(!result||result.delta!==data.delta)throw Error();
 $('two-days-status').textContent='서로 다른 실제 KST 날짜의 보존 기록 정확히 2건';
 $('two-days-delta').textContent=`${fmt(records[1].normalized_reading.normalized_value)} − ${fmt(records[0].normalized_reading.normalized_value)} = ${fmt(result.delta)}원 / 100엔 (${result.percent.toFixed(2)}%)`;
 $('two-days-raw').textContent=JSON.stringify(records.map(r=>({kstDate:r.kstDate,rawResponse:JSON.parse(r.rawResponse),normalized_reading:r.normalized_reading})),null,2);
}
show().catch(()=>{$('two-days-status').textContent='실제 이틀 보존본을 읽거나 대조하지 못했습니다. 새로고침하거나 기록 JSON을 확인하세요.';});
