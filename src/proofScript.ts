// Finds the {:ipm} lemma in a Dafny file and turns its proof body into the
// tactics the IPM prototype understands. Does not depend on VS Code.

export interface IpmLemma {
  ipmLine: number;    // line of the {:ipm} annotation (0-based)
  bodyStart: number;  // offset of the "{" that opens the lemma body
  bodyEnd: number;    // offset of the matching "}"
  firstLine: number;  // line of the opening "{"
  lastLine: number;   // line of the closing "}"
}

export interface TacticStep {
  line: number;   // 0-based line in the .dfy file
  tactic: string; // what we send to the prototype, e.g. "case (x % 2 == 0)"
}

// Replaces the contents of // and /* */ comments with spaces (newlines kept),
// so offsets and line numbers stay the same but comments are never matched.
export function maskComments(text: string): string {
  const out = text.split("");
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") {
        out[i++] = " ";
      }
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? text.length : end + 2;
      for (; i < stop; i++) {
        if (text[i] !== "\n") {
          out[i] = " ";
        }
      }
    } else if (text[i] === '"') {
      // skip string literals so "//" inside a string is not a comment
      i++;
      while (i < text.length && text[i] !== '"' && text[i] !== "\n") {
        i += text[i] === "\\" ? 2 : 1;
      }
      i++;
    } else {
      i++;
    }
  }
  return out.join("");
}

function lineOf(text: string, offset: number): number {
  let n = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === "\n") {
      n++;
    }
  }
  return n;
}

// Locates the first lemma with an {:ipm} annotation and its body.
export function findIpmLemma(text: string): IpmLemma | null {
  const code = maskComments(text);
  const ipm = code.indexOf("{:ipm}");
  if (ipm < 0) {
    return null;
  }
  // The body is the first "{" after the annotation that is not another attribute "{:".
  let open = ipm + "{:ipm}".length;
  while (open < code.length && !(code[open] === "{" && code[open + 1] !== ":")) {
    open++;
  }
  if (open >= code.length) {
    return null;
  }
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") {
      depth++;
    } else if (code[i] === "}") {
      depth--;
      if (depth === 0) {
        return {
          ipmLine: lineOf(text, ipm),
          bodyStart: open,
          bodyEnd: i,
          firstLine: lineOf(text, open),
          lastLine: lineOf(text, i),
        };
      }
    }
  }
  return null; // unbalanced braces (the user is still typing)
}

// The prototype must start from the lemma with an empty body, otherwise Dafny
// would already use the user's asserts. Newlines are kept so lines still match.
export function withEmptyBody(text: string, lemma: IpmLemma): string {
  const body = text.slice(lemma.bodyStart + 1, lemma.bodyEnd).replace(/[^\n]/g, " ");
  return text.slice(0, lemma.bodyStart + 1) + body + text.slice(lemma.bodyEnd);
}

// Translates one line of the proof into a tactic, or null if the line is
// only structure ("} else {", "}") or something we do not support yet.
//   if (c) {         -> case (c)
//   } else if (c) {  -> case (c)
//   assert e;        -> assert e
//   assume e;        -> assume e
export function lineToTactic(line: string): string | null {
  const s = line.trim().replace(/^}\s*else\s+/, "");
  let m = /^if\s*(.*?)\s*\{?$/.exec(s);
  if (m && m[1]) {
    const cond = m[1].startsWith("(") && m[1].endsWith(")") ? m[1] : `(${m[1]})`;
    return `case ${cond}`;
  }
  m = /^(assert|assume)\s+(.*?);?$/.exec(s);
  if (m) {
    return `${m[1]} ${m[2]}`;
  }
  return null;
}

// All tactics in the lemma body, in order, with the line they come from.
export function extractTactics(text: string, lemma: IpmLemma): TacticStep[] {
  // Only the text between the body braces, split into lines.
  const body = maskComments(text).slice(lemma.bodyStart + 1, lemma.bodyEnd).split("\n");
  const steps: TacticStep[] = [];
  body.forEach((src, i) => {
    const tactic = lineToTactic(src);
    if (tactic) {
      steps.push({ line: lemma.firstLine + i, tactic });
    }
  });
  return steps;
}
