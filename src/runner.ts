// Runs the IPM prototype inside Docker on one file, feeds it a list of tactics
// one by one and records the proof state after each of them.
// Does not depend on VS Code.

import { spawn } from "child_process";
import { clean, parseLastState, ProofState, waitingForInput } from "./parser";
import { TacticStep } from "./proofScript";

export interface RunnerConfig {
  dockerCommand: string;      // "docker"
  container: string;          // "ipm-work"
  prototypeDir: string;       // "/app/workdir"
  stepTimeoutMs: number;
}

export interface StepResult {
  step: TacticStep;
  state: ProofState | null; // null when the prototype printed no goal (error or finished)
  output: string;           // what the prototype printed for this step (cleaned)
}

export interface RunResult {
  initial: ProofState | null; // state before any tactic
  steps: StepResult[];
  finished: boolean;          // the prototype printed the final proof and exited
  log: string;                // the whole output, for debugging
}

export function runProof(
  cfg: RunnerConfig,
  containerFile: string,
  tactics: TacticStep[],
  signal?: AbortSignal,
  onOutput?: (text: string) => void   // raw output, for the "Dafny IPM" output channel
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const args = ["exec", "-i", "-w", cfg.prototypeDir, cfg.container,
                  "python", "-u", "dafny-incipm.py", containerFile];
    const child = spawn(cfg.dockerCommand, args);

    const result: RunResult = { initial: null, steps: [], finished: false, log: "" };
    let turn = "";          // output since the last tactic we sent
    let next = 0;           // index of the next tactic to send
    let closed = false;
    let timer: NodeJS.Timeout | undefined;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        finish(new Error(`The prototype did not answer within ${cfg.stepTimeoutMs / 1000}s.\n${clean(result.log).slice(-2000)}`));
      }, cfg.stepTimeoutMs);
    };

    const finish = (err?: Error) => {
      if (closed) {
        return;
      }
      closed = true;
      clearTimeout(timer);
      if (child.exitCode === null) {
        child.stdin.write(":quit\n");
        setTimeout(() => child.kill(), 2000);
      }
      err ? reject(err) : resolve(result);
    };

    // Called every time the prototype shows the prompt, i.e. waits for input.
    const onPrompt = () => {
      const state = parseLastState(turn);
      if (next === 0) {
        result.initial = state;
      } else {
        result.steps.push({ step: tactics[next - 1], state, output: clean(turn) });
      }
      if (next === tactics.length) {
        finish();
        return;
      }
      turn = "";
      onOutput?.(`\n>>> sending: ${tactics[next].tactic}\n`);
      child.stdin.write(tactics[next++].tactic + "\n");
      resetTimer();
    };

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      onOutput?.(text);
      result.log += text;
      turn += text;
      if (waitingForInput(turn)) {
        onPrompt();
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", err => finish(new Error(`Could not start '${cfg.dockerCommand}': ${err.message}`)));
    child.on("close", () => {
      // The prototype exits by itself once every goal is proved.
      if (next > 0 && result.steps.length < next) {
        result.steps.push({ step: tactics[next - 1], state: null, output: clean(turn) });
        result.finished = /Proof \d+ of /.test(clean(turn));
      }
      if (next === 0 && !result.initial) {
        finish(new Error(`The prototype stopped before showing a goal.\n${clean(result.log).slice(-2000)}`));
        return;
      }
      finish();
    });
    signal?.addEventListener("abort", () => finish(new Error("cancelled")));
    resetTimer();
  });
}
