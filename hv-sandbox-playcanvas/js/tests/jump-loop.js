/**
 * Browser jump-loop smoke test: 30 era swaps, no NaN velocities.
 * Enable with ?test=jumps
 */

const ERAS = ['1885', '1955', '1985', '2015', '2045'];

export async function runJumpStressTest({ timeMachine, arcade, cycles = 30 }) {
  const results = { cycles, fails: 0, eras: [] };
  console.log(`[JumpTest] starting ${cycles} jumps`);

  for (let i = 0; i < cycles; i++) {
    const current = timeMachine.getCurrentEra();
    const dest = ERAS[(ERAS.indexOf(current) + 1) % ERAS.length];
    arcade.setVelocity(42, 0, 18);
    await timeMachine.forceJumpTo(dest);
    const v = arcade.getVelocity();
    const nan = ![v.x, v.y, v.z, arcade.speedMPH].every(Number.isFinite);
    if (nan) {
      results.fails++;
      console.error('[JumpTest] NaN at cycle', i, v);
    }
    results.eras.push(timeMachine.getCurrentEra());
  }

  const summary = `[JumpTest] ${cycles} jumps, ${results.fails} NaN failures`;
  console.log(summary);
  const el = document.getElementById('status-bar');
  if (el) el.textContent = summary;
  return results;
}
