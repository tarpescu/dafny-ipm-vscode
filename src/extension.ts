// Entry point: VS Code calls activate() when a .dfy file is opened.

import * as vscode from "vscode";
import { IpmHoverProvider } from "./hover";

export function activate(context: vscode.ExtensionContext) {
  const hover = new IpmHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ language: "dafny" }, hover),
    hover
  );
}

export function deactivate() {}
