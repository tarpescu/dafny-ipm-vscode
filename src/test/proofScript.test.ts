// Run with: npm test
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { extractTactics, findIpmLemma, lineToTactic, withEmptyBody } from "../proofScript";

assert.strictEqual(lineToTactic("  if (x % 2 == 0) {"), "case (x % 2 == 0)");
assert.strictEqual(lineToTactic("if x > 0 {"), "case (x > 0)");
assert.strictEqual(lineToTactic("} else if (y < 3) {"), "case (y < 3)");
assert.strictEqual(lineToTactic("    assert a == b;"), "assert a == b");
assert.strictEqual(lineToTactic("assume x >= 0;"), "assume x >= 0");
assert.strictEqual(lineToTactic("} else {"), null);
assert.strictEqual(lineToTactic("}"), null);

// The real example: the header comment also mentions {:ipm} and must be ignored.
const text = fs.readFileSync(path.join(__dirname, "../../examples/example1.dfy"), "utf8");
const lines = text.split("\n");
const lemma = findIpmLemma(text);
assert.ok(lemma);
assert.ok(lines[lemma.ipmLine].includes("ensures {:ipm}"));
assert.strictEqual(lines[lemma.firstLine].trim(), "{");
assert.strictEqual(lines[lemma.lastLine].trim(), "}");

const steps = extractTactics(text, lemma);
assert.deepStrictEqual(steps.map(s => s.tactic), [
  "case (x % 2 == 0)",
  "assert x * (x + 1) == 2 * ((x / 2) * (x + 1))",
  "assert x * (2 * (x / 2) + 2) == 2 * (x * ((x / 2) + 1))",
]);
assert.ok(lines[steps[0].line].includes("if (x % 2 == 0)"));

const empty = withEmptyBody(text, lemma);
assert.strictEqual(empty.split("\n").length, lines.length); // same line numbers
assert.ok(!empty.slice(empty.lastIndexOf("{:ipm}")).includes("assert"));

// Comments inside the body are not tactics.
const t2 = "lemma L(x: int)\n ensures {:ipm} x == x\n{\n  // assert x == 1;\n  assert x == x;\n}\n";
const l2 = findIpmLemma(t2)!;
assert.deepStrictEqual(extractTactics(t2, l2), [{ line: 4, tactic: "assert x == x" }]);

console.log("proofScript tests passed");
