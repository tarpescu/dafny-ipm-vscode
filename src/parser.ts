// Turns the raw terminal output of dafny-incipm.py into structured data.
// This file does not depend on VS Code, so it can be tested with plain Node.

export const PROMPT = "Enter a tactic";

export interface ProofState {
  goalsRemaining: number | null; // "2 goal(s) remaining"
  hypotheses: string[];          // lines under "hypotheses"
  goal: string;                  // line(s) under "goal"
  otherGoals: string[];          // "Goal 2: ...", "Goal 3: ..."
}

// Remove colour codes (colorama) and carriage returns (prompt_toolkit redraws).
export function clean(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\r\n?/g, "\n");
}

// Parses the most recent "current goal:" block that is followed by the prompt,
// i.e. the state the prototype is waiting on. Returns null if there is none yet.
export function parseLastState(rawText: string): ProofState | null {
  const text = clean(rawText);
  const start = text.lastIndexOf("current goal:");
  if (start < 0) {
    return null;
  }
  const end = text.indexOf(PROMPT, start);
  if (end < 0) {
    return null; // the prototype has not finished printing this state yet
  }

  const before = text.slice(0, start);
  const remainingMatches = [...before.matchAll(/(\d+) goal\(s\) remaining/g)];
  const goalsRemaining = remainingMatches.length
    ? parseInt(remainingMatches[remainingMatches.length - 1][1], 10)
    : null;

  const lines = text.slice(start, end).split("\n").map(l => l.trim());
  const hypotheses: string[] = [];
  const goalLines: string[] = [];
  const otherGoals: string[] = [];
  let section: "none" | "hyp" | "goal" = "none";

  for (const line of lines) {
    if (line === "" || line.startsWith("current goal:")) {
      continue;
    }
    if (line === "hypotheses") {
      section = "hyp";
      continue;
    }
    if (line === "goal") {
      section = "goal";
      continue;
    }
    if (/^Goal \d+:/.test(line)) {
      otherGoals.push(line);
      continue;
    }
    if (line.startsWith("Solver check status") || line.startsWith("Current goal not yet proved")) {
      section = "none";
      continue;
    }
    if (section === "hyp") {
      hypotheses.push(line);
    } else if (section === "goal") {
      goalLines.push(line);
    }
  }

  return { goalsRemaining, hypotheses, goal: goalLines.join(" "), otherGoals };
}

// When every goal is proved the prototype prints "Proof 0 of <goal>:" followed
// by Dafny code and exits. Returns that code, or null if it is not there.
export function parseFinalProof(rawText: string): string | null {
  const text = clean(rawText);
  const match = /Proof \d+ of [^\n]*:\n([\s\S]*)$/.exec(text);
  if (!match) {
    return null;
  }
  // Drop a trailing shell prompt if the output was copied from a terminal.
  const body = match[1].replace(/\n[^\n]*[#$] *$/, "");
  return body.replace(/\n{3,}/g, "\n\n").trimEnd();
}

// True when the prototype has answered and is now waiting for the next tactic:
// the output ends with the prompt, and there is real output before it (not only
// the prompt redrawn by prompt_toolkit together with the tactic we just typed).
export function waitingForInput(rawTurn: string): boolean {
  const text = clean(rawTurn);
  const last = text.lastIndexOf(PROMPT);
  // After the prompt there may be only whitespace (prompt_toolkit adds \r and cursor moves).
  if (last < 0 || !/^Enter a tactic[^\n]*:\s*$/.test(text.slice(last))) {
    return false;
  }
  const before = text
    .slice(0, last)
    .replace(/Enter a tactic[^\n]*/g, "")             // redrawn prompts (+ echoed tactic)
    .replace(/Warning: Input is not a terminal[^\n]*/g, "");
  return before.trim().length > 0;
}
