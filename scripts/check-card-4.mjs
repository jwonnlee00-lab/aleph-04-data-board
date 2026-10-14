import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resetEvaluationState,runFixture} from '../dist/state.mjs';
import {upsertDaily} from '../dist/daily.mjs';
const root=new URL('../dist/fixtures/',import.meta.url);
const fixtures={};for(const name of ['normal-d1-a','normal-d1-b','normal-d2'])fixtures[name]=JSON.parse(await readFile(new URL(name+'.json',root),'utf8'));
let state=resetEvaluationState();const steps=[];
for(const [index,name] of ['normal-d1-a','normal-d1-b','normal-d1-b','normal-d2'].entries()){
 const before=state.daily_readings.length;state=runFixture(state,fixtures[name]);
 assert.equal(state.daily_readings.length,index===3?2:1);
 steps.push({run:index+1,fixture:fixtures[name].fixture_id,utc:fixtures[name].payload.fetched_at,kstDate:fixtures[name].payload.record_date,rowsBefore:before,rowsAfter:state.daily_readings.length,recordId:state.daily_readings.at(-1).record_id,value:state.current_reading.normalized_value});
}
assert.equal(steps[0].recordId,steps[1].recordId);assert.equal(steps[1].recordId,steps[2].recordId);assert.notEqual(steps[2].recordId,steps[3].recordId);
let liveLike={version:1,records:[],lastAttempt:null};const raw=rate=>({date:'2026-08-24',base:'JPY',quote:'KRW',rate});
const liveSteps=[];
for(const [iso,rate] of [['2026-08-24T14:00:00.000Z',8.1],['2026-08-24T14:30:00.000Z',8.2],['2026-08-24T14:59:59.999Z',8.3],['2026-08-24T15:00:00.000Z',8.4]]){
 const before=liveLike.records.length;liveLike=upsertDaily(liveLike,raw(rate),iso,JSON.stringify(raw(rate)));
 liveSteps.push({utc:iso,kstDate:liveLike.records.at(-1).kstDate,rowsBefore:before,rowsAfter:liveLike.records.length,recordId:liveLike.records.at(-1).record_id,value:liveLike.records.at(-1).value.rate});
}
assert.deepEqual(liveSteps.map(x=>x.rowsAfter),[1,1,1,2]);assert.equal(liveSteps[2].kstDate,'2026-08-24');assert.equal(liveSteps[3].kstDate,'2026-08-25');assert.equal(liveLike.records[0].firstCollectedAt,'2026-08-24T14:00:00.000Z');assert.equal(liveLike.records[0].collectedAt,'2026-08-24T14:59:59.999Z');assert.equal(liveLike.records[0].value.rate,8.3);assert.equal(liveLike.firstObservation.value.rate,8.1);
const persisted=JSON.parse(await readFile(new URL('../dist/observations.json',import.meta.url),'utf8'));
const report={checkedAt:new Date().toISOString(),timezone:'Asia/Seoul',uniqueKey:['signal_id','record_date'],updateRule:'upsert latest successful reading; preserve record_id and first_fetched_at',syntheticOnly:true,pass:true,steps,liveStorageSyntheticClock:liveSteps,actualKstDates:persisted.records.map(r=>r.kstDate)};
if(!process.argv.includes('--no-report'))await writeFile(new URL('../evidence/card-4-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:true,rows:[0,...steps.map(x=>x.rowsAfter)],storageRows:[0,...liveSteps.map(x=>x.rowsAfter)],midnightBoundary:['2026-08-24T14:59:59.999Z → 2026-08-24 KST','2026-08-24T15:00:00.000Z → 2026-08-25 KST']}));
