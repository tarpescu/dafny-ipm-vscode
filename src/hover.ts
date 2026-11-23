// Hover over a line in the proof of an {:ipm} lemma -> show the proof state
// (hypotheses and goal) after that line, like the terminal prototype does.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { clean, ProofState } from "./parser";
import { extractTactics, findIpmLemma, withEmptyBody } from "./proofScript";
import { RunResult, runProof } from "./runner";

interface CachedRun {
  version: number;
  promise: Promise<RunResult>;
  abort: AbortController;
}

export class IpmHoverProvider implements vscode.HoverProvider {
  // One prototype run per document version; hovering again reuses it.
  private runs = new Map<string, CachedRun>();
  // View → Output → "Dafny IPM": everything the prototype prints.
  private log = vscode.window.createOutputChannel("Dafny IPM");

  async provideHover(doc: vscode.TextDocument, pos: vscode.Position): Promise<vscode.Hover | undefined> {
    const text = doc.getText();
    const lemma = findIpmLemma(text);
    if (!lemma || pos.line < lemma.ipmLine || pos.line > lemma.lastLine) {
      return undefined;
    }
    const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!folder) {
      return message("Open the folder that is mounted in the Docker container (File → Open Folder).");
    }

    let run: RunResult;
    try {
      run = await this.getRun(doc, folder.uri.fsPath);
    } catch (err) {
      return message("The prototype failed:\n\n```text\n" + String(err instanceof Error ? err.message : err) + "\n```");
    }

    // The state after the last tactic on or above the hovered line.
    const done = run.steps.filter(r => r.step.line <= pos.line);
    const last = done[done.length - 1];
    if (!last) {
      return stateHover("Initial goal", run.initial);
    }
    if (last.state) {
      return stateHover(`After \`${last.step.tactic}\``, last.state);
    }
    if (run.finished && last === run.steps[run.steps.length - 1]) {
      return message(`After \`${last.step.tactic}\`: **all goals proved** ✓`);
    }
    return message(`After \`${last.step.tactic}\` the prototype printed:\n\n\`\`\`text\n${last.output.trim().slice(-1500)}\n\`\`\``);
  }

  private getRun(doc: vscode.TextDocument, root: string): Promise<RunResult> {
    const key = doc.uri.toString();
    const cached = this.runs.get(key);
    if (cached && cached.version === doc.version) {
      return cached.promise;
    }
    cached?.abort.abort(); // the text changed, the old run is useless

    const text = doc.getText();
    const lemma = findIpmLemma(text)!;
    const tactics = extractTactics(text, lemma);

    // The prototype reads a copy of the file with the proof body removed,
    // written to <workspace>/.ipm/ so that the container can see it.
    const tmpFile = path.join(root, ".ipm", path.basename(doc.fileName));
    fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
    fs.writeFileSync(tmpFile, withEmptyBody(text, lemma));

    const cfg = vscode.workspace.getConfiguration("dafnyIpm");
    const containerFile = path.posix.join(
      cfg.get("containerMountPath", "/work"),
      ...path.relative(root, tmpFile).split(path.sep)
    );
    const rawLog = path.join(root, ".ipm", "last-run.log");
    fs.writeFileSync(rawLog, "");
    const abort = new AbortController();
    const promise = runProof({
      dockerCommand: cfg.get("dockerCommand", "docker"),
      container: cfg.get("container", "ipm-work"),
      prototypeDir: cfg.get("prototypeDir", "/app/workdir"),
      stepTimeoutMs: cfg.get("stepTimeoutSeconds", 120) * 1000,
    }, containerFile, tactics, abort.signal, text => {
      this.log.append(clean(text));
      fs.appendFileSync(rawLog, text); // raw bytes, escape codes included, for debugging
    });
    this.log.appendLine(`\n=== ${doc.fileName} (version ${doc.version}): ${tactics.length} tactic(s) ===`);

    promise.catch(() => this.runs.delete(key)); // retry on the next hover
    vscode.window.setStatusBarMessage(`$(sync~spin) Dafny IPM: running ${tactics.length} tactic(s)...`, promise);
    this.runs.set(key, { version: doc.version, promise, abort });
    return promise;
  }

  dispose(): void {
    this.runs.forEach(r => r.abort.abort());
    this.log.dispose();
  }
}

function message(markdown: string): vscode.Hover {
  return new vscode.Hover(new vscode.MarkdownString("**Dafny IPM** · " + markdown));
}

function stateHover(title: string, state: ProofState | null): vscode.Hover {
  if (!state) {
    return message(`${title}: no goal was printed.`);
  }
  const md = new vscode.MarkdownString();
  const remaining = state.goalsRemaining === null ? "" : ` · ${state.goalsRemaining} goal(s) remaining`;
  md.appendMarkdown(`**Dafny IPM** · ${title}${remaining}\n`);
  const width = Math.max(10, state.goal.length, ...state.hypotheses.map(h => h.length));
  md.appendCodeblock([...state.hypotheses, "─".repeat(width), state.goal].join("\n"), "text");
  for (const g of state.otherGoals) {
    md.appendCodeblock(g, "text");
  }
  return new vscode.Hover(md);
}
