import {kstDate,API} from './core.mjs';
import {applySuccessfulReading,resetEvaluationState} from './state.mjs';
export const SIGNAL='jpy-krw-100';
export function normalizeLive(value,collectedAt){return {signal_id:SIGNAL,normalized_value:value.rate*100,unit:'KRW/100JPY',source_name:'Frankfurter / ECB',source_url:API,source_time:null,fetched_at:collectedAt,record_timezone:'Asia/Seoul',record_date:kstDate(new Date(collectedAt))};}
export function upsertDaily(input,value,collectedAt,rawResponse){
 const store=structuredClone(input);
 if(!store.firstObservation && store.records.length)store.firstObservation=structuredClone(store.records[0]);
 const reading=normalizeLive(value,collectedAt);
 let state=resetEvaluationState();
 for(const record of store.records)state=applySuccessfulReading(state,normalizeLive(record.value,record.collectedAt));
 state=applySuccessfulReading(state,reading);
 const existingIndex=store.records.findIndex(r=>(r.signal_id??SIGNAL)===reading.signal_id && r.kstDate===reading.record_date);
 const existing=existingIndex>=0?store.records[existingIndex]:null;
 const stateRow=state.daily_readings.find(r=>r.signal_id===reading.signal_id && r.record_date===reading.record_date);
 const record={signal_id:reading.signal_id,record_id:existing?.record_id??`live-${reading.signal_id}-${reading.record_date}`,kstDate:reading.record_date,firstCollectedAt:existing?.firstCollectedAt??existing?.collectedAt??collectedAt,collectedAt,source:API,rawResponse,value:structuredClone(value),normalized_reading:stateRow.reading};
 if(existingIndex>=0)store.records[existingIndex]=record;else store.records.push(record);
 store.records.sort((a,b)=>a.kstDate.localeCompare(b.kstDate));
 if(!store.firstObservation)store.firstObservation=structuredClone(record);
 return store;
}
