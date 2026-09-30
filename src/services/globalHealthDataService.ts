import { OutbreakCluster } from '../types';

export interface ClusterRecurrenceAnalysis {
  isThresholdExceeded: boolean;
  diseaseName: string;
  recurrencePeriodicity: string;
  estimatedClusterRate: number;
  epidemicThresholdRate: number;
  recommendedProtocol: string;
}

export class GlobalHealthDataService {
  public static analyzeClusterRecurrence(
    cluster: OutbreakCluster,
    region = 'AFRO_EAST_TURKANA'
  ): ClusterRecurrenceAnalysis {
    const isPediatricSurge =
      (cluster.demographic_breakdown?.pediatric_vulnerability_pct ?? 50) > 40;

    const estimatedRate = Math.round(cluster.case_count * 18.5);
    const thresholdRate = 80;
    const isThresholdExceeded = estimatedRate >= thresholdRate || cluster.severity === 'CRITICAL_OUTBREAK';

    return {
      isThresholdExceeded,
      diseaseName: isPediatricSurge
        ? 'Pediatric Viral Bronchiolitis / RSV Epidemic Wave'
        : 'Atypical Febrile Pneumonia / Outbreak Cluster',
      recurrencePeriodicity: 'Seasonal Monsoon Post-Rainy Surge (Biannual Cyclic Wave)',
      estimatedClusterRate: estimatedRate,
      epidemicThresholdRate: thresholdRate,
      recommendedProtocol:
        'Immediate mobile rapid antigen tests, portable pulse oximetry, cold-chain antibiotic and bronchodilator cache deployment to local community health workers.',
    };
  }
}
