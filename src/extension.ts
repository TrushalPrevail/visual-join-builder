import * as vscode from 'vscode';
import { WebviewManager } from './WebviewManager';

export function activate(context: vscode.ExtensionContext) {
	const openCommand = vscode.commands.registerCommand('visual-join-builder.open', () => {
		WebviewManager.render(context.extensionUri);
	});

	const openFromCellCommand = vscode.commands.registerCommand('visual-join-builder.openFromCell', () => {
		WebviewManager.render(context.extensionUri);
	});

	context.subscriptions.push(openCommand, openFromCellCommand);
}

export function deactivate() {}
