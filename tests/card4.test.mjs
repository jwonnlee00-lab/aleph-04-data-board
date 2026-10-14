import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('same date three successes upsert one row; KST next date adds exactly one',()=>{execFileSync(process.execPath,['scripts/check-card-4.mjs','--no-report'],{stdio:'pipe'});});
