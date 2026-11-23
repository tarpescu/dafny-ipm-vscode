// A transcript in the same format as smtinc.py prints it (colours included).
const Y = "\x1b[33m", B = "\x1b[34m", G = "\x1b[32m", C = "\x1b[36m", R = "\x1b[0m";

export const STATE_TEXT =
  `Running dafny ...\r\n` +
  `${G}\n2 goal(s) remaining\n\n` +
  `${B}current goal:\n` +
  `${Y}hypotheses\n` +
  `   (x >= 0)\n` +
  `${Y}goal\n` +
  `   (((x * (x + 1)) % 2) == 0)\n` +
  `${C}Goal 2:${R} (y > 0)\n\n` +
  `${C}Enter a tactic (e.g., assert <expression>, :help, :quit): ${R}`;

export const FINAL_TEXT =
  `${G}Congrats, current goal proved.${R}\n` +
  `\n0 goal(s) remaining\n\n` +
  `Proof 0 of (((x * (x + 1)) % 2) == 0):\n` +
  `if (x % 2 == 0) {\n  assert x % 2 == 0;\n} else {\n  assert (x + 1) % 2 == 0;\n}\n\n\n` +
  `root@abc123:/app/workdir# `;
