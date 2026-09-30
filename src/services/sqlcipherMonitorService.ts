export interface SqlcipherSystemState {
  crypto: {
    latencyStatus: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    totalTriageWriteLatencyMs: number;
    encryptionOverheadMs: number;
  };
  disk: {
    totalFileSizeFormatted: string;
    totalPageCount: number;
  };
}

export class SqlcipherMonitorService {
  private static state: SqlcipherSystemState = {
    crypto: {
      latencyStatus: 'NOMINAL',
      totalTriageWriteLatencyMs: 14,
      encryptionOverheadMs: 6,
    },
    disk: {
      totalFileSizeFormatted: '48.2 KB',
      totalPageCount: 12,
    },
  };

  private static listeners: Array<(state: SqlcipherSystemState) => void> = [];

  public static getSystemState(): SqlcipherSystemState {
    return { ...this.state };
  }

  public static updateLatency(writeMs: number, overheadMs: number) {
    const status: 'NOMINAL' | 'WARNING' | 'CRITICAL' =
      writeMs > 100 ? 'CRITICAL' : writeMs > 50 ? 'WARNING' : 'NOMINAL';
    this.state = {
      ...this.state,
      crypto: {
        latencyStatus: status,
        totalTriageWriteLatencyMs: writeMs,
        encryptionOverheadMs: overheadMs,
      },
    };
    this.notify();
  }

  public static subscribe(listener: (state: SqlcipherSystemState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }
}
