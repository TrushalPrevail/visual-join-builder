import * as vscode from 'vscode';
import { WebviewManager } from './WebviewManager';

class VisualJoinCodeLensProvider implements vscode.CodeLensProvider {
	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const lenses: vscode.CodeLens[] = [];
		const pandasUsagePattern = /(pd\.[a-zA-Z_]+|import pandas|dataframe)/i;

		for (let index = 0; index < document.lineCount; index++) {
			const line = document.lineAt(index).text;
			if (!pandasUsagePattern.test(line)) {
				continue;
			}

			const range = new vscode.Range(index, 0, index, 0);
			lenses.push(
				new vscode.CodeLens(range, {
					title: '✨ Visual Join',
					command: 'visual-join-builder.openFromCell'
				})
			);
		}

		return lenses;
	}
}

export function activate(context: vscode.ExtensionContext) {
	const openCommand = vscode.commands.registerCommand('visual-join-builder.open', () => {
		WebviewManager.render(context.extensionUri);
	});

	const openFromCellCommand = vscode.commands.registerCommand('visual-join-builder.openFromCell', () => {
		WebviewManager.render(context.extensionUri);
	});

	const codeLensProvider = new VisualJoinCodeLensProvider();
	const codeLensSelector: vscode.DocumentSelector = [
		{ notebookType: 'jupyter-notebook', language: 'python' },
		{ language: 'python' }
	];
	const codeLensDisposable = vscode.languages.registerCodeLensProvider(codeLensSelector, codeLensProvider);

	context.subscriptions.push(openCommand, openFromCellCommand, codeLensDisposable);
}

export function deactivate() {}
