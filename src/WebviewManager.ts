import * as vscode from 'vscode';
import { NotebookInserter } from './NotebookInserter';
import type { HostToWebviewMessage } from './types/messages';
import { WebviewMessageZ } from './types/schemas';

export class WebviewManager {
	private static instance: WebviewManager | undefined;
	private panel: vscode.WebviewPanel | undefined;
	private readonly webviewBuildUri: vscode.Uri;

	private constructor(private readonly extensionUri: vscode.Uri) {
		this.webviewBuildUri = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'build');
	}

	public static render(extensionUri: vscode.Uri): void {
		if (!WebviewManager.instance) {
			WebviewManager.instance = new WebviewManager(extensionUri);
		}

		WebviewManager.instance.show();
	}

	private show(): void {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.Beside);
			return;
		}

		this.panel = vscode.window.createWebviewPanel(
			'visual-join-builder',
			'Visual Join Builder',
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
			{
				enableScripts: true,
				localResourceRoots: [this.webviewBuildUri]
			}
		);

		this.panel.onDidDispose(() => {
			this.panel = undefined;
		});

		this.panel.webview.onDidReceiveMessage(async (raw: unknown) => {
			const result = WebviewMessageZ.safeParse(raw);
			if (!result.success) {
				console.error('Invalid message from Webview:', result.error);
				return;
			}

			const message = result.data;
			if (message.command === 'ready') {
				this.postMessage({
					command: 'kernelStatus',
					payload: { active: false }
				});
				return;
			}

			if (message.command === 'insertCode') {
				await NotebookInserter.insertCode(message.payload.code);
			}
		});

		this.panel.webview.html = this.getWebviewHtml(this.panel.webview);
	}

	private postMessage(message: HostToWebviewMessage): void {
		void this.panel?.webview.postMessage(message);
	}

	private getWebviewHtml(webview: vscode.Webview): string {
		const nonce = this.getNonce();
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.webviewBuildUri, 'assets', 'index.js')
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.webviewBuildUri, 'assets', 'index.css')
		);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
	<link rel="stylesheet" href="${styleUri}">
	<title>Visual Join Builder</title>
</head>
<body>
	<div id="root"></div>
	<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
	}

	private getNonce(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let text = '';

		for (let i = 0; i < 32; i++) {
			text += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		return text;
	}
}
