import * as vscode from 'vscode';
import type { TableSchema } from './types/joinState';
import { ColumnSchemaZ } from './types/schemas';

const TABLE_DISCOVERY_SCRIPT =
	"import json, pandas as pd; print(json.dumps({k: [{'name': c, 'dtype': str(v[c].dtype), 'nullable': bool(v[c].isna().any())} for c in v.columns] for k, v in globals().items() if isinstance(v, pd.DataFrame)}))";

const EXECUTION_TIMEOUT_MS = 10_000;
const PREVIEW_RESULT_MARKER = '__VJB_PREVIEW_RESULT__=';

type KernelStatus = 'unknown' | 'starting' | 'idle' | 'busy' | 'terminating' | 'restarting' | 'autorestarting' | 'dead';

interface KernelOutputItem {
	mime: string;
	data: Uint8Array;
}

interface KernelOutput {
	items: KernelOutputItem[];
	metadata?: unknown;
}

interface JupyterKernelApi {
	status: KernelStatus;
	language: string;
	executeCode(code: string, token: vscode.CancellationToken): AsyncIterable<KernelOutput>;
	executeHidden?(code: string): Promise<unknown>;
}

interface JupyterApi {
	kernels: {
		getKernel(uri: vscode.Uri): Thenable<JupyterKernelApi | undefined>;
	};
}

export interface KernelStatusSnapshot {
	active: boolean;
	kernelName?: string;
}

export interface PreviewExecutionResult {
	html: string;
	rowCount: number;
	errorMessage?: string;
}

export class JupyterKernel {
	public static async discoverTables(): Promise<TableSchema[]> {
		try {
			const kernel = await this.getActiveKernel();
			if (!kernel) {
				return [];
			}

			const rawOutput = await this.runSilently(kernel, TABLE_DISCOVERY_SCRIPT);
			const parsed = this.tryParseLastJson(rawOutput);
			if (!this.isRecord(parsed)) {
				return [];
			}

			const tables: TableSchema[] = [];
			for (const [name, columns] of Object.entries(parsed)) {
				const result = ColumnSchemaZ.array().safeParse(columns);
				if (result.success) {
					tables.push({
						name,
						columns: result.data
					});
				}
			}

			return tables;
		} catch (error) {
			console.error('Failed to discover DataFrames from active kernel:', error);
			return [];
		}
	}

	public static async executePreview(code: string): Promise<PreviewExecutionResult> {
		try {
			if (!code.trim()) {
				return {
					html: '',
					rowCount: 0,
					errorMessage: 'Add at least one join before previewing results.'
				};
			}

			const kernel = await this.getActiveKernel();
			if (!kernel) {
				return {
					html: '',
					rowCount: 0,
					errorMessage: 'No active Jupyter kernel. Start a notebook kernel and run a cell first.'
				};
			}

			const outputVariable = this.inferOutputVariable(code);
			if (!outputVariable) {
				return {
					html: '',
					rowCount: 0,
					errorMessage: 'Could not determine the output DataFrame for preview.'
				};
			}

			const previewScript = [
				'import json',
				code,
				`__vjb_preview_source = ${outputVariable}`,
				"if not hasattr(__vjb_preview_source, 'to_html') and hasattr(__vjb_preview_source, 'toPandas'):",
				'    __vjb_preview_source = __vjb_preview_source.toPandas()',
				'__vjb_preview_html = __vjb_preview_source.head(5).to_html(index=False)',
				'__vjb_preview_count = int(len(__vjb_preview_source))',
				`print('${PREVIEW_RESULT_MARKER}' + json.dumps({'html': __vjb_preview_html, 'rowCount': __vjb_preview_count}))`
			].join('\n');

			const rawOutput = await this.runSilently(kernel, previewScript);
			const payload = this.extractPreviewPayload(rawOutput);
			if (!payload) {
				return {
					html: '',
					rowCount: 0,
					errorMessage: 'Preview execution completed, but no HTML output was returned.'
				};
			}

			return {
				html: payload.html,
				rowCount: payload.rowCount
			};
		} catch (error) {
			console.error('Failed to execute preview in active kernel:', error);
			return {
				html: '',
				rowCount: 0,
				errorMessage: 'Preview execution failed in the active kernel.'
			};
		}
	}

	public static async getKernelStatus(): Promise<KernelStatusSnapshot> {
		try {
			const kernel = await this.getActiveKernel();
			if (!kernel) {
				return { active: false };
			}

			return {
				active: this.isKernelActive(kernel.status),
				kernelName: kernel.language || undefined
			};
		} catch (error) {
			console.error('Failed to read kernel status:', error);
			return { active: false };
		}
	}

	private static async getActiveKernel(): Promise<JupyterKernelApi | undefined> {
		const notebookUri = vscode.window.activeNotebookEditor?.notebook.uri;
		if (!notebookUri) {
			return undefined;
		}

		const jupyterExtension = vscode.extensions.getExtension('ms-toolsai.jupyter');
		if (!jupyterExtension) {
			return undefined;
		}

		const activated = await jupyterExtension.activate();
		if (!this.isJupyterApi(activated)) {
			return undefined;
		}

		return activated.kernels.getKernel(notebookUri);
	}

	private static isJupyterApi(value: unknown): value is JupyterApi {
		if (!this.isRecord(value)) {
			return false;
		}

		const kernels = value.kernels;
		return this.isRecord(kernels) && typeof kernels.getKernel === 'function';
	}

	private static async runSilently(kernel: JupyterKernelApi, code: string): Promise<string> {
		if (typeof kernel.executeHidden === 'function') {
			const hiddenResult = await this.withTimeout(
				Promise.resolve(kernel.executeHidden(code)),
				EXECUTION_TIMEOUT_MS,
				'Kernel hidden execution timed out after 10 seconds.'
			);
			return this.extractHiddenOutputText(hiddenResult);
		}

		const tokenSource = new vscode.CancellationTokenSource();
		const timeout = setTimeout(() => {
			tokenSource.cancel();
		}, EXECUTION_TIMEOUT_MS);

		try {
			const chunks: string[] = [];
			for await (const output of kernel.executeCode(code, tokenSource.token)) {
				chunks.push(this.extractKernelOutputText(output));
			}

			return chunks.join('');
		} catch (error) {
			if (tokenSource.token.isCancellationRequested) {
				throw new Error('Kernel execution timed out after 10 seconds.');
			}
			throw error;
		} finally {
			clearTimeout(timeout);
			tokenSource.dispose();
		}
	}

	private static extractKernelOutputText(output: KernelOutput): string {
		return output.items.map((item) => this.decodeData(item.data)).join('');
	}

	private static extractHiddenOutputText(hiddenResult: unknown): string {
		if (typeof hiddenResult === 'string') {
			return hiddenResult;
		}

		if (!Array.isArray(hiddenResult)) {
			return '';
		}

		return hiddenResult.map((entry) => this.extractHiddenOutputEntryText(entry)).join('');
	}

	private static extractHiddenOutputEntryText(entry: unknown): string {
		if (!this.isRecord(entry)) {
			return '';
		}

		const outputType = typeof entry.output_type === 'string' ? entry.output_type : '';
		if (outputType === 'stream') {
			return this.normalizeText(entry.text);
		}

		if (outputType === 'error') {
			return this.normalizeText(entry.traceback);
		}

		const data = entry.data;
		if (this.isRecord(data)) {
			const html = data['text/html'];
			if (typeof html === 'string') {
				return html;
			}

			const plain = data['text/plain'];
			return this.normalizeText(plain);
		}

		return this.normalizeText(entry.text);
	}

	private static normalizeText(value: unknown): string {
		if (typeof value === 'string') {
			return value;
		}

		if (Array.isArray(value)) {
			return value
				.filter((item): item is string => typeof item === 'string')
				.join('');
		}

		return '';
	}

	private static decodeData(data: Uint8Array): string {
		return new TextDecoder().decode(data);
	}

	private static tryParseLastJson(rawText: string): unknown {
		const candidates = rawText
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		for (let index = candidates.length - 1; index >= 0; index--) {
			try {
				return JSON.parse(candidates[index]);
			} catch {
				// Continue scanning lines for the last valid JSON object.
			}
		}

		return undefined;
	}

	private static extractPreviewPayload(rawText: string): { html: string; rowCount: number } | undefined {
		const markerLine = rawText
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.reverse()
			.find((line) => line.startsWith(PREVIEW_RESULT_MARKER));

		if (!markerLine) {
			return undefined;
		}

		const encodedPayload = markerLine.slice(PREVIEW_RESULT_MARKER.length);
		try {
			const parsed = JSON.parse(encodedPayload);
			if (!this.isRecord(parsed) || typeof parsed.html !== 'string' || typeof parsed.rowCount !== 'number') {
				return undefined;
			}

			return {
				html: parsed.html,
				rowCount: parsed.rowCount
			};
		} catch {
			return undefined;
		}
	}

	private static inferOutputVariable(code: string): string | undefined {
		let candidate: string | undefined;
		const assignmentPattern = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/u;

		for (const line of code.split(/\r?\n/u)) {
			const match = assignmentPattern.exec(line.trim());
			if (match) {
				candidate = match[1];
			}
		}

		return candidate;
	}

	private static isKernelActive(status: KernelStatus): boolean {
		return status !== 'dead' && status !== 'terminating' && status !== 'unknown';
	}

	private static isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(timeoutMessage));
			}, timeoutMs);

			void promise
				.then((value) => {
					clearTimeout(timer);
					resolve(value);
				})
				.catch((error) => {
					clearTimeout(timer);
					reject(error);
				});
		});
	}
}
