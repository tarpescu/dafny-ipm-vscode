#!/usr/bin/env node
// Pretends to be "docker exec ... dafny-incipm.py" for runner.test.ts.
// Behaves like the real prototype on example1: three tactics, then the proof.
// It also redraws the prompt with the typed tactic, like prompt_toolkit does.
const P = "\x1b[36mEnter a tactic (e.g., assert <expression>, :help, :quit): \x1b[0m";
const state = (n, hyps, goal) =>
  `\n${n} goal(s) remaining\n\ncurrent goal:\nhypotheses\n${hyps.map(h => "   " + h + "\n").join("")}goal\n   ${goal}\n\n`;
const G = "(((x * (x + 1)) % 2) == 0)";
const answers = [
  state(2, ["(0 == (x % 2))"], G) + "Goal 2: " + G + "\n",
  "Congrats, current goal proved.\n" + state(1, ["¬((0 == (x % 2)))"], G),
  "Congrats, current goal proved.\n\nProof 0 of " + G + ":\nif ((0 == (x % 2))) {\n  assert A;\n} else {\n  assert B;\n}\n\n",
];
process.stdout.write("Warning: Input is not a terminal (fd=0).\n" + state(1, [], G) + P);
let k = 0, buf = "";
process.stdin.on("data", d => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    process.stdout.write("\r" + P);              // redraw in two chunks
    setTimeout(() => {
      process.stdout.write(line + "\n");
      setTimeout(() => {
        process.stdout.write(answers[k]);
        if (++k === answers.length) process.exit(0);
        process.stdout.write(P);
      }, 50);
    }, 50);
  }
});
