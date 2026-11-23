// Run with: npm test
import * as assert from "assert";
import { clean, parseFinalProof, parseLastState, waitingForInput } from "../parser";
import { FINAL_TEXT, STATE_TEXT } from "./sample";

assert.strictEqual(clean("\x1b[33mgoal\x1b[0m\r\n"), "goal\n");

const state = parseLastState(STATE_TEXT);
assert.ok(state, "state should be parsed");
assert.strictEqual(state.goalsRemaining, 2);
assert.deepStrictEqual(state.hypotheses, ["(x >= 0)"]);
assert.strictEqual(state.goal, "(((x * (x + 1)) % 2) == 0)");
assert.deepStrictEqual(state.otherGoals, ["Goal 2: (y > 0)"]);
assert.strictEqual(parseLastState(STATE_TEXT.split("Enter a tactic")[0]), null);

const proof = parseFinalProof(FINAL_TEXT);
assert.ok(proof && proof.startsWith("if (x % 2 == 0)"));

// Prompt detection
const P = "Enter a tactic (e.g., assert <expression>, :help, :quit): ";
assert.strictEqual(waitingForInput(STATE_TEXT), true);
assert.strictEqual(waitingForInput("\r" + P), false);                      // only a redraw
assert.strictEqual(waitingForInput("\r" + P + "case (x > 0)\n"), false);   // redraw + echo
assert.strictEqual(waitingForInput("\r" + P + "case (x > 0)\n\n1 goal(s) remaining\n" + P), true);
assert.strictEqual(waitingForInput("partial output"), false);
assert.strictEqual(waitingForInput("1 goal(s) remaining\n\x1b[0m" + P + "\x1b[?7h\r\x1b[58C"), true); // cursor moves after prompt

console.log("parser tests passed");
