import { OutbreakCluster } from '../types';

export class OutbreakAlertService {
  private static alertListeners: Array<(alert: { type: string; title: string; detail: string }) => void> = [];

  public static evaluateClusters(clusters: OutbreakCluster[]): void {
    const critical = clusters.filter((c) => c.severity === 'CRITICAL_OUTBREAK' || c.severity === 'HIGH_ALERT');
    if (critical.length > 0) {
      console.info(`[OutbreakAlertService] Active high alert clusters: ${critical.length}`);
    }
  }

  public static triggerSimulatedAlert(type: string): void {
    const alert = {
      type,
      title: 'CRITICAL OUTBREAK DETECTED: Cluster #104',
      detail: 'Epidemic threshold exceeded in Turkana Catchment Zone 4. Pediatric respiratory surge +48% over 72h.',
    };
    this.alertListeners.forEach((l) => l(alert));
  }

  public static subscribe(listener: (alert: { type: string; title: string; detail: string }) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }
}
