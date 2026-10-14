import {resetEvaluationState,runFixture} from './state.mjs';
const $=id=>document.getElementById(id);
const files=['normal-d1-a','normal-d1-b','normal-d2','timeout','auth-401','rate-429','offline','schema-break','recover-d2'];
const fixtures=new Map();
let state=resetEvaluationState(),busy=false,events=[];
const guidance={
 timeout:['느린 외부 응답','응답 지연 5000ms가 제한 1500ms를 넘었습니다. 잠시 뒤 다시 시도하세요.'],
 auth:['외부 원천 401/403 거절','외부 원천이 접근을 거절했습니다. 원천의 공개 접근 상태를 확인한 뒤 다시 시도하세요. 이 앱에 로그인할 필요는 없습니다.'],
 rate_limit:['호출 제한 429','Retry-After: 60초입니다. 추가 호출을 멈추고 60초 뒤 다시 시도하세요. 합성 복구는 가상 D2 시계로 즉시 재생합니다.'],
 offline:['오프라인','연결이 끊긴 상황입니다. 인터넷 연결을 확인한 뒤 다시 시도하세요.'],
 schema_error:['응답 형식 변경','normalized_value가 숫자에서 문자열로 바뀌었습니다. 응답 형식·adapter를 확인하고 정상 형식이 돌아온 뒤 다시 시도하세요.']
};
function render(){
 const status=state.status;
 $('replay-value').textContent=state.current_reading?`${state.current_reading.normalized_value} ${state.current_reading.unit}`:'—';
 $('replay-status').textContent=status?`${status.freshness} / ${status.error_code}`:'초기화 · 정상값 없음';
 $('replay-status').className='badge '+(status?.freshness==='stale'?'fail':'');
 $('replay-stale').textContent=status?.freshness==='stale'?'오래된 값 · 마지막 정상값입니다. 현재 값으로 확인되지 않았습니다.':status?'정상 합성값 · 실제 엔화 환율이 아닙니다.':'합성 상태만 비웠습니다. 실제 엔화 기록은 보존됩니다.';
 $('lab').textContent=status?.freshness==='stale'?`${guidance[status.error_code][0]}: ${guidance[status.error_code][1]}`:status?`정상 재생 · 일별 행 ${state.daily_readings.length}개 · 변화 ${state.last_delta??'비교 대기'}${state.last_delta===null?'':' pt'}`:'정상 D1-A → D1-B를 재생하세요.';
 $('replay-count').textContent=`합성 일별 행 ${state.daily_readings.length}개 · 실제 기록에 포함되지 않음`;
 $('replay-rows').replaceChildren();
 for(const row of state.daily_readings){const tr=document.createElement('tr');for(const value of [row.record_date,row.normalized_value+' '+row.unit,row.record_id]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('replay-rows').append(tr);}
 $('replay-log').textContent=events.join('\n');
 $('replay-json').textContent=JSON.stringify(state,null,2);
}
function lock(value){busy=value;for(const id of ['simulate','retry-replay','reset-replay','baseline-replay','normal-d2','daily-replay'])$(id).disabled=value;}
function apply(name){
 const fixture=fixtures.get(name);state=runFixture(state,fixture);
 events.push(`${fixture.fixture_id}: ${state.current_reading?.normalized_value??'—'} / ${state.status.freshness} / ${state.status.error_code} / 行 ${state.daily_readings.length}`);
 render();
}
function reset(){state=resetEvaluationState();events=[];$('daily-summary').textContent='';render();}
function baseline(){reset();apply('normal-d1-a');apply('normal-d1-b');}
async function fail(){
 if(busy)return;lock(true);baseline();
 const name=$('scenario').value,fixture=fixtures.get(name);
 $('lab').textContent=`${fixture.fixture_id} 합성 재생 중 · 외부 원천 요청 없음`;
 await new Promise(resolve=>setTimeout(resolve,Math.min(fixture.transport.delay_ms,fixture.transport.deadline_ms)));
 apply(name);lock(false);
}
$('simulate').addEventListener('click',fail);
$('retry-replay').addEventListener('click',()=>{if(!busy)apply('recover-d2');});
$('baseline-replay').addEventListener('click',()=>{if(!busy)baseline();});
$('reset-replay').addEventListener('click',()=>{if(!busy)reset();});
$('normal-d2').addEventListener('click',()=>{if(!busy)apply('normal-d2');});
$('daily-replay').addEventListener('click',()=>{if(busy)return;reset();const counts=[0];for(const name of ['normal-d1-a','normal-d1-b','normal-d1-b','normal-d2']){apply(name);counts.push(state.daily_readings.length);}$('daily-summary').textContent='카드 4 시험 통과 · 행 수 '+counts.join(' → ')+' · 같은 날 세 번은 같은 record ID, 다음 날짜는 새 ID';});
$('export-replay').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({synthetic:true,package_id:'aleph-t04-real-information-board-public-contract-v2',events,state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='synthetic-replay-state.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
async function boot(){lock(true);try{for(const name of files){const response=await fetch(`./fixtures/${name}.json`,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('fixture unavailable');fixtures.set(name,await response.json());}baseline();lock(false);}catch{$('lab').textContent='공개 fixture를 읽지 못했습니다. 페이지를 새로고침하세요. 합성 결과를 만들어 표시하지 않습니다.';}}
boot();
