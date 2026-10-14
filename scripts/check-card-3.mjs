import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {resetEvaluationState,runFixture} from '../dist/state.mjs';
const root=new URL('../assets/studio-task-assets/t04-real-information-board/',import.meta.url);
const referenceModule={exports:{}};
runInNewContext(await readFile(new URL('adapter-reset.example.js',root),'utf8'),{module:referenceModule,URL,Intl});
const reference=referenceModule.exports;
const files=['normal-d1-a','normal-d1-b','normal-d2','timeout','auth-401','rate-429','offline','schema-break','recover-d2'];
const fixtures={};for(const name of files)fixtures[name]=JSON.parse(await readFile(new URL(`fixtures/${name}.json`,root),'utf8'));
const livePath=new URL('../dist/observations.json',import.meta.url);
const before=await readFile(livePath);
const results=[];
function sequence(names){let state=resetEvaluationState(),ref=reference.resetEvaluationState();const steps=[];for(const name of names){const fixture=fixtures[name];state=runFixture(state,fixture);ref=reference.runFixture(ref,fixture);assert.deepEqual(state,JSON.parse(JSON.stringify(ref)),'runtime and reference adapter differ');const expected=fixture.expected;assert.equal(state.status.freshness,expected.freshness);assert.equal(state.status.error_code,expected.error_code);assert.equal(state.daily_readings.length,expected.row_count);assert.equal(state.current_reading.normalized_value,expected.stored_value);assert.equal(state.last_delta,expected.delta);steps.push({fixture_id:fixture.fixture_id,status:state.status,current_value:state.current_reading.normalized_value,row_count:state.daily_readings.length,record_ids:state.daily_readings.map(r=>r.record_id),state});}return {steps,state};}
const normal=sequence(['normal-d1-a','normal-d1-b','normal-d2']);assert.equal(normal.steps[0].record_ids[0],normal.steps[1].record_ids[0]);results.push({name:'normal A → B → D2',pass:true,...normal});
for(const name of ['timeout','auth-401','rate-429','offline','schema-break']){const r=sequence(['normal-d1-a','normal-d1-b',name]);assert.deepEqual(r.steps[1].state.current_reading,r.state.current_reading);assert.deepEqual(r.steps[1].state.daily_readings,r.state.daily_readings);results.push({name,pass:true,...r});const recovered=runFixture(r.state,fixtures['recover-d2']);assert.deepEqual(recovered.status,{freshness:'fresh',error_code:'none'});assert.equal(recovered.daily_readings.filter(row=>row.record_date==='2026-08-25').length,1);assert.equal(recovered.daily_readings.length,2);assert.equal(recovered.current_reading.normalized_value,120);const repeated=runFixture(recovered,fixtures['recover-d2']);assert.equal(repeated.daily_readings.length,2);results.push({name:name+' → recover D2 twice',pass:true,state:repeated});}
const auth403={...fixtures['auth-401'],transport:{...fixtures['auth-401'].transport,status:403}};assert.equal(runFixture(resetEvaluationState(),auth403).status.error_code,'auth');
assert.deepEqual(resetEvaluationState(),JSON.parse(JSON.stringify(reference.resetEvaluationState())));
const after=await readFile(livePath);assert.ok(before.equals(after),'replay modified actual observations');
const report={package_id:'aleph-t04-real-information-board-public-contract-v2',checkedAt:new Date().toISOString(),referenceMatches:true,syntheticOnly:true,liveRecordsUnchanged:true,liveRecordsSha256:createHash('sha256').update(before).digest('hex'),actualKstDates:JSON.parse(before).records.map(r=>r.kstDate),checks:results.length+2,pass:true,results};
if(!process.argv.includes('--no-report'))await writeFile(new URL('../evidence/card-3-replay-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,pass:true,referenceMatches:true,liveRecordsUnchanged:true,actualKstDates:report.actualKstDates,report:'evidence/card-3-replay-results.json'}));
