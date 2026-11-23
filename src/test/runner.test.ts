// Runs runProof() against fake-docker.js instead of the real container.
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { runProof } from "../runner";

import * as os from "os";

// A small executable script in the temp folder that stands in for "docker"
// and runs fake-docker.js with node (so the repo file needs no exec bit).
const script = path.resolve(__dirname, "../../src/test/fake-docker.js");
const fake = path.join(os.tmpdir(), "fake-docker.sh");
fs.writeFileSync(fake, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`, { mode: 0o755 });
const steps = [
  { line: 10, tactic: "case (x % 2 == 0)" },
  { line: 11, tactic: "assert A" },
  { line: 13, tactic: "assert B" },
];

runProof({ dockerCommand: fake, container: "fake", prototypeDir: "/", stepTimeoutMs: 5000 },
         "/work/.ipm/example1.dfy", steps).then(run => {
  assert.strictEqual(run.initial?.goal, "(((x * (x + 1)) % 2) == 0)");
  assert.deepStrictEqual(run.initial?.hypotheses, []);
  assert.strictEqual(run.steps.length, 3);
  assert.deepStrictEqual(run.steps[0].state?.hypotheses, ["(0 == (x % 2))"]);
  assert.strictEqual(run.steps[0].state?.goalsRemaining, 2);
  assert.deepStrictEqual(run.steps[1].state?.hypotheses, ["¬((0 == (x % 2)))"]);
  assert.strictEqual(run.steps[2].state, null);
  assert.strictEqual(run.finished, true);
  console.log("runner tests passed");
}).catch(err => { console.error(err); process.exit(1); });
