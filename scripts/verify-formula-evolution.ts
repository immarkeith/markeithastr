// Read-only; uses the existing trusted server environment. Never seeds on startup.
import { verifyFormulaInitialization } from '../src/lib/formula-lifecycle.server';

const lanes = await verifyFormulaInitialization();
console.log(JSON.stringify({ verified_lanes: lanes.length, lanes }, null, 2));