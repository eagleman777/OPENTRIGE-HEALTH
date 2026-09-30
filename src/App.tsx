import React, { useState } from 'react';
import { 
  Smartphone, 
  MapPin, 
  Activity, 
  Wifi, 
  WifiOff, 
  Radio, 
  Database, 
  ShieldCheck, 
  FileCheck2, 
  Layers, 
  Users, 
  RefreshCw,
  Zap,
  Globe2,
  Stethoscope,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  RotateCw,
  AlertTriangle
} from 'lucide-react';
import { MobileFieldSimulator } from './components/MobileFieldSimulator';
import { GeospatialOutbreakMap } from './components/GeospatialOutbreakMap';
import { ClinicalPatientIntakeForm } from './components/ClinicalPatientIntakeForm';
import { NetworkCondition, AuditScope } from './types';
import { LocalDatabaseService } from './services/localDatabase';
import { OpportunisticSyncManager } from './services/OpportunisticSyncManager';

export function App() {
  const [activeTab, setActiveTab] = useState<'INTAKE' | 'MOBILE' | 'MAP' | 'SYNC'>('INTAKE');
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition>('ONLINE');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [isRetryingFailed, setIsRetryingFailed] = useState<boolean>(false);

  const handleAssessmentCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleRetryFailedSyncs = async () => {
    setIsRetryingFailed(true);
    try {
      const result = await OpportunisticSyncManager.retryFailedSyncs(networkCondition);
      setRefreshKey((k) => k + 1);
      setExportToast(result.message);
      setTimeout(() => setExportToast(null), 6000);
    } catch (err: any) {
      setExportToast(`Retry failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleExportCsv = () => {
    const assessments = LocalDatabaseService.getTriageAssessments();
    const patients = LocalDatabaseService.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    const headers = [
      'Assessment ID',
      'Patient ID',
      'First Name',
      'Last Name',
      'Biological Sex',
      'Age Cohort',
      'Birth Year',
      'Village / Settlement',
      'CHW Worker ID',
      'Timestamp (UTC)',
      'Temperature (°C)',
      'Respiratory Rate (BPM)',
      'Oxygen Saturation (%)',
      'Heart Rate (BPM)',
      'Triage Urgency',
      'Inferred Condition',
      'Edge-ML Confidence',
      'Symptoms',
      'Outbreak Flagged',
      'Latitude',
      'Longitude',
      'Altitude (m)',
      'GPS Accuracy (m)',
      'Clinical Notes',
      'Sync Status',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = assessments.map((a) => {
      const p = patientMap.get(a.patient_id);
      return [
        escapeCsv(a.id),
        escapeCsv(a.patient_id),
        escapeCsv(p?.first_name ?? ''),
        escapeCsv(p?.last_name ?? ''),
        escapeCsv(a.sex ?? p?.gender ?? ''),
        escapeCsv(a.age_range ?? ''),
        escapeCsv(p?.birth_year ?? ''),
        escapeCsv(p?.village_name ?? ''),
        escapeCsv(a.chw_worker_id),
        escapeCsv(a.captured_at),
        escapeCsv(a.temperature_celsius),
        escapeCsv(a.respiratory_rate_bpm),
        escapeCsv(a.oxygen_saturation_pct),
        escapeCsv(a.heart_rate_bpm),
        escapeCsv(a.triage_urgency),
        escapeCsv(a.edge_ml_inferred_condition),
        escapeCsv(a.edge_ml_confidence ? `${(a.edge_ml_confidence * 100).toFixed(1)}%` : ''),
        escapeCsv((a.symptoms || []).join('; ')),
        escapeCsv(a.is_outbreak_flagged ? 'YES' : 'NO'),
        escapeCsv(a.latitude),
        escapeCsv(a.longitude),
        escapeCsv(a.altitude_meters),
        escapeCsv(a.gps_accuracy_meters),
        escapeCsv(a.clinical_notes || ''),
        escapeCsv(a.server_synced_at ? 'SYNCED' : 'PENDING_OFFLINE'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `opentriage_assessments_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast(`Exported ${assessments.length} patient assessment records to CSV for offline report generation.`);
    setTimeout(() => setExportToast(null), 5000);
  };

  const syncQueue = LocalDatabaseService.getSyncQueue();
  const pendingSyncCount = syncQueue.filter((i) => i.status === 'PENDING' || i.status === 'FAILED_RETRY').length;
  const failedRetryCount = syncQueue.filter((i) => i.status === 'FAILED_RETRY').length;
  const triageCount = LocalDatabaseService.getTriageAssessments().length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Mission Control Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white tracking-tight text-base sm:text-lg">OpenTriage Health</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Mothercode Geo-Surveillance
                </span>
              </div>
              <p className="text-xs text-slate-400">Offline Edge-ML Diagnostics & PostGIS DBSCAN Outbreak Mapping</p>
            </div>
          </div>

          {/* Network Condition & Sync Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['ONLINE', 'SPOTTY_2G', 'OFFLINE', 'PACKET_LOSS'] as const).map((net) => {
                const isActive = networkCondition === net;
                return (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetworkCondition(net)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
                      isActive
                        ? net === 'ONLINE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : net === 'OFFLINE'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {net === 'ONLINE' ? <Wifi className="h-3 w-3" /> : net === 'OFFLINE' ? <WifiOff className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                    <span>{net.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('INTAKE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'INTAKE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Clinical Intake</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MOBILE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'MOBILE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Field Device</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MAP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'MAP'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Outbreak Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SYNC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'SYNC'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Sync Outbox</span>
                {pendingSyncCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-black rounded-full text-[10px] font-mono font-bold">
                    {pendingSyncCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        {activeTab === 'INTAKE' && (
          <div className="max-w-3xl mx-auto">
            <ClinicalPatientIntakeForm
              key={refreshKey}
              networkCondition={networkCondition}
              onIntakeCompleted={() => {
                handleAssessmentCreated();
              }}
            />
          </div>
        )}

        {activeTab === 'MOBILE' && (
          <div className="max-w-2xl mx-auto">
            <MobileFieldSimulator
              key={refreshKey}
              networkCondition={networkCondition}
              onAssessmentCreated={handleAssessmentCreated}
            />
          </div>
        )}

        {activeTab === 'MAP' && (
          <div>
            <GeospatialOutbreakMap
              key={refreshKey}
              selectedClusterId={selectedClusterId}
              onSelectCluster={(id) => setSelectedClusterId(id)}
              networkCondition={networkCondition}
            />
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Opportunistic Zero-Trust Sync Daemon</h3>
                  <p className="text-slate-400 text-xs">
                    Local SQLCipher Outbox • Ed25519 Cryptographic Signatures • PostGIS Ingestion
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryFailedSyncs}
                  disabled={isRetryingFailed || failedRetryCount === 0}
                  className={`px-3.5 py-2 font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                    failedRetryCount > 0
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                  }`}
                  title={
                    failedRetryCount > 0
                      ? `Trigger OpportunisticSyncManager to specifically attempt to resend ${failedRetryCount} item(s) with FAILED_RETRY status`
                      : 'No items currently in FAILED_RETRY status'
                  }
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isRetryingFailed ? 'animate-spin' : ''}`} />
                  <span>Retry Failed Syncs</span>
                  {failedRetryCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-white text-rose-700 rounded-full text-[10px] font-mono font-bold">
                      {failedRetryCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Export local SQLite patient assessment data as CSV for offline analysis and reporting"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Export Data to CSV</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await OpportunisticSyncManager.flushSyncQueue(networkCondition);
                    setRefreshKey((k) => k + 1);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Flush Outbox & Sync</span>
                </button>
              </div>
            </div>

            {exportToast && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/50 rounded-xl text-cyan-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>{exportToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExportToast(null)}
                  className="text-cyan-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Triage Assessments</span>
                <span className="text-white text-lg font-bold">{triageCount}</span>
                <span className="text-slate-500 text-[10px] block">Stored in local SQLCipher DB</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Queued In Outbox</span>
                <span className="text-amber-400 text-lg font-bold">{pendingSyncCount}</span>
                <span className="text-slate-500 text-[10px] block">Awaiting network window</span>
              </div>
              <div className={`p-3.5 rounded-xl border transition-colors ${
                failedRetryCount > 0 ? 'bg-rose-950/20 border-rose-800/40' : 'bg-slate-950 border-slate-800'
              }`}>
                <span className="text-slate-400 block text-[10px]">Failed Retries</span>
                <span className={`text-lg font-bold ${failedRetryCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {failedRetryCount}
                </span>
                <span className="text-slate-500 text-[10px] block">
                  {failedRetryCount > 0 ? 'Targeted by Retry Daemon' : 'Zero transmission errors'}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cryptographic Envelope</span>
                <span className="text-emerald-400 text-lg font-bold">Ed25519</span>
                <span className="text-slate-500 text-[10px] block">Zero-Trust Signed Payloads</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-300 text-xs font-mono">Sync Queue Log:</h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Network: <strong className="text-white">{networkCondition}</strong>
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {syncQueue.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">Sync queue is clean. All records acknowledged by server.</p>
                ) : (
                  syncQueue.map((item) => (
                    <div
                      key={item.queue_id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2 transition-colors ${
                        item.status === 'FAILED_RETRY'
                          ? 'bg-rose-950/20 border-rose-800/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-cyan-400">{item.entity_type}</span>
                          <span className="font-mono text-slate-400">({item.mutation_type})</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            item.status === 'ACKNOWLEDGED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            item.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          }`}>
                            {item.status}
                          </span>
                          {item.retry_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              Retry #{item.retry_count}
                            </span>
                          )}
                        </div>

                        <div className="font-mono text-[10px] text-slate-500">
                          ID: {item.entity_id} • Idempotency: {item.idempotency_key.slice(0, 16)}...
                        </div>

                        {item.last_error && (
                          <div className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{item.last_error}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                        <div className="font-mono text-[10px] text-slate-500">
                          {new Date(item.client_timestamp).toLocaleTimeString()}
                        </div>
                        {item.status === 'FAILED_RETRY' && (
                          <button
                            type="button"
                            onClick={handleRetryFailedSyncs}
                            disabled={isRetryingFailed}
                            className="px-2 py-1 bg-rose-700 hover:bg-rose-600 active:scale-95 text-white rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCw className={`h-3 w-3 ${isRetryingFailed ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}
                        {item.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => {
                              OpportunisticSyncManager.markItemAsFailed(item.queue_id);
                              setRefreshKey((k) => k + 1);
                            }}
                            className="text-[9px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                            title="Simulate network failure on this queue item to test retry handling"
                          >
                            Simulate Drop
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
