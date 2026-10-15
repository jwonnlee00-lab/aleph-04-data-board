import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {API,kstDate,hundredYen,compare} from '../dist/core.mjs';
const path=new URL('../dist/card-5-records.json',import.meta.url);
const input=JSON.parse(await readFile(path,'utf8'));
assert.equal(input.records.length,2);
const records=[...input.records].sort((a,b)=>a.collectedAt.localeCompare(b.collectedAt));
assert.equal(new Set(records.map(r=>kstDate(new Date(r.collectedAt)))).size,2);
for(const record of records){
 assert.equal(record.kstDate,kstDate(new Date(record.collectedAt)));
 assert.equal(record.source,API);
 assert.deepEqual(JSON.parse(record.rawResponse),record.value);
 assert.equal(record.normalized_reading.normalized_value,hundredYen(record.value.rate));
 assert.equal(record.normalized_reading.unit,'KRW/100JPY');
 assert.equal(record.normalized_reading.source_url,record.source);
 assert.equal(record.normalized_reading.fetched_at,record.collectedAt);
 assert.equal(record.normalized_reading.source_time,null);
}
const cents=records.map(r=>Math.round(r.normalized_reading.normalized_value*100));
const independentlyCalculatedDelta=(cents[1]-cents[0])/100;
const comparison=compare(records,records[1].kstDate);
assert.equal(comparison.delta,independentlyCalculatedDelta);
assert.equal(comparison.delta,input.delta);
const report={pass:true,checkedAt:new Date().toISOString(),actualDates:records.map(r=>r.kstDate),actualRecordCount:2,normalizedValues:records.map(r=>r.normalized_reading.normalized_value),unit:'KRW/100JPY',delta:comparison.delta,percent:comparison.percent,calculation:`${records[1].normalized_reading.normalized_value} - ${records[0].normalized_reading.normalized_value} = ${comparison.delta}`,sourceTimeLimitation:'Source provides date only; exact timestamp is null.',platformReceiptsVerified:false};
if(!process.argv.includes('--no-report'))await writeFile(new URL('../evidence/card-5-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
