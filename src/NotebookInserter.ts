import * as vscode from 'vscode';

export class NotebookInserter {
	public static async insertCode(code: string): Promise<void> {
		const notebookEditor = vscode.window.activeNotebookEditor;
		if (notebookEditor) {
			const notebook = notebookEditor.notebook;
			const position = notebookEditor.selections[0]?.end ?? notebook.cellCount;
			const edit = new vscode.WorkspaceEdit();
			edit.set(notebook.uri, [
				vscode.NotebookEdit.insertCells(position, [
					new vscode.NotebookCellData(vscode.NotebookCellKind.Code, code, 'python')
				])
			]);

			const applied = await vscode.workspace.applyEdit(edit);
			if (!applied) {
				void vscode.window.showWarningMessage('Could not insert code into the active notebook.');
			}
			return;
		}

		const textEditor = vscode.window.activeTextEditor;
		if (textEditor) {
			const inserted = await textEditor.edit((builder) => {
				builder.insert(textEditor.selection.active, code);
			});

			if (!inserted) {
				void vscode.window.showWarningMessage('Could not insert code into the active file.');
			}
			return;
		}

		void vscode.window.showWarningMessage('Open a notebook or Python file first.');
	}
}
