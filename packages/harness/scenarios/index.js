// Central scenario registration for the harness
import { registerStressScenario } from './stress.js';
import { registerReclaimScenario } from './reclaim.js';
import { registerRaceScenario } from './race.js';
import { registerCorrectScenario } from './correct.js';
import { registerGenCycleScenario } from './gencycle.js';
import { registerDosScenario } from './dos.js';

export function registerAllScenarios(ctx) {
  registerStressScenario(ctx);
  registerReclaimScenario(ctx);
  registerRaceScenario(ctx);
  registerCorrectScenario(ctx);
  registerGenCycleScenario(ctx);
  registerDosScenario(ctx);
}
