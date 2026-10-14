import {kstDate,receive,compare} from './core.mjs';
const $=id=>document.getElementById(id);
const KEY='aleph04-last-good-v1';
const SHARED='https://raw.githubusercontent.com/jwonnlee00-lab/aleph-04-data-board/main/dist/observations.json';
let archive={version:1,records:[],lastAttempt:null},last=null,busy=false,realStatus='공유 기록 확인 중',realBadge='보존된 기록',realClass='warn',remoteFailed=false;
const fmt=n=>n.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
const time=t=>new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false});
const messages={network:'연결에 실패했습니다. 오프라인·DNS·CORS 등 원인은 이 화면에서 구분할 수 없습니다.',timeout:'8초 안에 응답이 오지 않았습니다. 원천의 현재 값은 확인하지 못했습니다.',http:'원천이 HTTP 오류를 반환했습니다. 재시도 후 확인하세요.',invalid:'응답의 형식이나 값이 올바르지 않아 사용하지 않았습니다.',stale:'기준일이 5일 넘게 지났거나 날짜가 역행했습니다. 새 정상값으로 사용하지 않았습니다.'};
function setStatus(text,badge,cls=''){ $('status').textContent=text;$('badge').textContent=badge;$('badge').className='badge '+cls; }
function render(){
  $('clock').textContent=kstDate()+' · KST';
  $('rate').textContent=last?fmt(last.value.rate):'—';
  $('source-date').textContent=last?.value.date??'미확인';
  $('received').textContent=last?time(last.collectedAt):'정상 수신 기록 없음';
  const comparison=compare(archive.records);
  $('delta').textContent=comparison?`어제 대비 ${comparison.delta>0?'+':''}${fmt(comparison.delta)}원 (${comparison.percent>0?'+':''}${comparison.percent.toFixed(2)}%) · 실제 일별 첫 기록 비교`:'어제 대비 미확인 · 오늘과 어제의 실제 기록이 모두 필요합니다.';
  $('records').replaceChildren();
  for(const record of [...archive.records].reverse()){
    const row=document.createElement('tr');
    for(const val of [record.kstDate,record.value.date,fmt(record.value.rate)]){const cell=document.createElement('td');cell.textContent=val;row.append(cell);}
    $('records').append(row);
  }
  if(!archive.records.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='아직 공유된 실제 기록이 없습니다.';row.append(cell);$('records').append(row);}
  const count=new Set(archive.records.map(r=>r.kstDate)).size;
  $('progress').textContent=`서로 다른 실제 KST 날짜 ${count}건 / 최소 2건 ${count>=2?'✓':'· 두 번째 실제 수집 대기'}`;
  $('record-status').textContent=(remoteFailed?'공유 기록 서버 조회 실패 · 배포에 포함된 보존본을 표시합니다. ':'GitHub에 보존된 공유 기록입니다. ')+(archive.lastAttempt?`최근 수집: ${time(archive.lastAttempt.at)} · ${archive.lastAttempt.ok?'정상':`실패 (${archive.lastAttempt.reason})`}`:'수집 상태 미확인');
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(last));}catch{$('storage').textContent='브라우저 저장 실패 · 공유 기록은 보존됩니다.';}}
function lock(v){busy=v;for(const id of ['refresh','simulate','restore'])$(id).disabled=v;}
async function refresh(mode='live'){
  if(busy)return;lock(true);
  const synthetic=mode!=='live',before=JSON.stringify(last);
  $('attempt').textContent=time(new Date().toISOString())+(synthetic?' · 합성 재생':'');
  setStatus(synthetic?'합성 실패를 재생 중입니다. 실제 원천에 요청하지 않습니다.':'공개 원천에 요청 중입니다. 마지막 정상값을 유지합니다.',synthetic?'합성 재생 중':'수신 중','warn');
  const result=await receive(fetch,mode,new Date(),last?.value??null,synthetic?800:8000);
  if(result.ok){
    last={value:result.data,collectedAt:new Date().toISOString()};persist();render();
    realBadge=result.data.date===kstDate()?'정상 수신':'정상 수신 · 이전 기준일';realClass=result.data.date===kstDate()?'':'warn';
    realStatus='실제 원천에서 정상 응답을 받았습니다. '+(result.data.date===kstDate()?'':'원천 기준일은 KST 오늘보다 앞섭니다. 주말·휴일·공표 시차일 수 있습니다. ')+'이 기기에 마지막 정상값을 저장했습니다. 공유 일별 기록은 별도 실제 수집 작업이 보존합니다.';
  } else {
    const explanation=messages[result.reason]+' '+(last?'표시값은 마지막 정상 수신값이며 현재 값은 미확인입니다.':'보존된 정상값이 없어 값을 표시하지 않습니다.');
    if(synthetic){setStatus('[합성 재생] '+explanation,'합성 실패 · '+result.reason,'fail');$('lab').textContent=`${mode}: ${JSON.stringify(last)===before?'통과 · 마지막 정상값 유지':'실패 · 값 변경'} / 실제 일별 기록 ${archive.records.length}건 보존`;}
    else {realBadge='수신 실패 · '+result.reason;realClass='fail';realStatus=explanation;}
  }
  if(!synthetic){setStatus(realStatus,realBadge,realClass);$('lab').textContent='실제 상태를 표시 중입니다. 실패 재생은 일별 기록에 포함되지 않습니다.';}
  lock(false);
}
async function getJSON(url){const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('fetch');return response.json();}
function validArchive(data){return data?.version===1 && Array.isArray(data.records) && data.records.every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.kstDate)&&Number.isFinite(Date.parse(r.collectedAt))&&r.value?.base==='USD'&&r.value?.quote==='KRW'&&typeof r.value.rate==='number'&&Number.isFinite(r.value.rate)&&r.value.rate>0&&/^\d{4}-\d{2}-\d{2}$/.test(r.value.date));}
async function boot(){
  try{const data=await getJSON('./observations.json');if(!validArchive(data))throw Error();archive=data;}catch{realStatus='배포에 포함된 기록도 읽지 못했습니다.';}
  try{const data=await getJSON(SHARED);if(!validArchive(data))throw Error();archive=data;}catch{remoteFailed=true;}
  archive.records.sort((a,b)=>a.kstDate.localeCompare(b.kstDate));
  last=archive.records.at(-1)??null;
  try{const cached=JSON.parse(localStorage.getItem(KEY));if(cached?.value?.base==='USD'&&cached.value.quote==='KRW'&&typeof cached.value.rate==='number'&&Number.isFinite(cached.value.rate)&&cached.value.rate>0&&Number.isFinite(Date.parse(cached.collectedAt))&&(!last||Date.parse(cached.collectedAt)>Date.parse(last.collectedAt)))last=cached;}catch{$('storage').textContent='브라우저 저장소 사용 불가 · 공유 기록으로 확인';}
  render();realStatus=last?'보존된 마지막 정상값입니다. 아직 이번 방문의 원천 응답을 확인하지 않았습니다.':'정상 수신 기록이 없습니다.';setStatus(realStatus,realBadge,realClass);
  await refresh();
}
$('refresh').addEventListener('click',()=>refresh());
$('simulate').addEventListener('click',()=>refresh($('scenario').value));
$('restore').addEventListener('click',()=>{setStatus(realStatus,realBadge,realClass);$('attempt').textContent='실제 상태 복귀 · '+time(new Date().toISOString());$('lab').textContent='합성 재생이 끝났습니다. 실제 상태와 기록을 표시합니다.';});
$('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='actual-kst-observations.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
boot().catch(()=>{lock(false);setStatus('화면 초기화에 실패했습니다. 새로고침 후 다시 확인하세요.','초기화 실패','fail');});
