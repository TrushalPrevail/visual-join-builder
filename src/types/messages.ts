import type { JoinState, TableSchema } from './joinState';

export type WebviewToHostMessage =
	| {
		command: 'ready';
	}
	| {
		command: 'insertCode';
		payload: { code: string };
	}
	| {
		command: 'requestTables';
	}
	| {
		command: 'requestPreview';
		payload: { joinState: JoinState };
	}
	| {
		command: 'saveState';
		payload: { joinState: JoinState };
	};

export type HostToWebviewMessage =
	| {
		command: 'loadTables';
		payload: { tables: TableSchema[] };
	}
	| {
		command: 'previewResult';
		payload: { html: string; rowCount: number };
	}
	| {
		command: 'previewError';
		payload: { message: string };
	}
	| {
		command: 'restoreState';
		payload: { joinState: JoinState };
	}
	| {
		command: 'kernelStatus';
		payload: { active: boolean; kernelName?: string };
	};
