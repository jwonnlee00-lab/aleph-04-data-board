import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('two actual KST days match raw stored normalized values and recalculated change',()=>{execFileSync(process.execPath,['scripts/check-card-5.mjs','--no-report'],{stdio:'pipe'});});
