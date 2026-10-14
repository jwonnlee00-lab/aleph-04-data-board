import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('official fixtures: reference equivalence, five failures, recovery and actual record isolation',()=>{execFileSync(process.execPath,['scripts/check-card-3.mjs','--no-report'],{stdio:'pipe'});});
