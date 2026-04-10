import { JupyterKernel, type KernelStatusSnapshot } from './JupyterKernel';
import type { TableSchema } from './types/joinState';

const POLL_INTERVAL_MS = 5_000;

export interface TableDiscoverySnapshot {
	tables: TableSchema[];
	kernelStatus: KernelStatusSnapshot;
}

type SnapshotHandler = (snapshot: TableDiscoverySnapshot) => void;

export class TableDiscovery {
	private interval: NodeJS.Timeout | undefined;
	private lastTablesFingerprint = '';
	private lastKernelFingerprint = '';
	private readonly onSnapshot: SnapshotHandler;

	constructor(onSnapshot: SnapshotHandler) {
		this.onSnapshot = onSnapshot;
	}

	public start(): void {
		if (this.interval) {
			return;
		}

		void this.forceRefresh();
		this.interval = setInterval(() => {
			void this.poll();
		}, POLL_INTERVAL_MS);
	}

	public stop(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = undefined;
		}
	}

	public async forceRefresh(): Promise<void> {
		await this.poll(true);
	}

	private async poll(force = false): Promise<void> {
		const [discoveredTables, kernelStatus] = await Promise.all([
			JupyterKernel.discoverTables(),
			JupyterKernel.getKernelStatus()
		]);
		if (discoveredTables === null) {
			return;
		}

		const tables = discoveredTables;
		const tableFingerprint = JSON.stringify(tables);
		const kernelFingerprint = JSON.stringify(kernelStatus);
		const changed =
			tableFingerprint !== this.lastTablesFingerprint || kernelFingerprint !== this.lastKernelFingerprint;

		if (!force && !changed) {
			return;
		}

		this.lastTablesFingerprint = tableFingerprint;
		this.lastKernelFingerprint = kernelFingerprint;
		this.onSnapshot({ tables, kernelStatus });
	}
}
