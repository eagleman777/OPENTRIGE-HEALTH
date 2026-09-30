import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Battery, 
  BatteryCharging,
  BatteryWarning,
  BatteryLow,
  Zap,
  Lock, 
  Cpu, 
  Activity, 
  Thermometer, 
  Heart, 
  Wind, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Clock,
  UserPlus,
  Fingerprint,
  ShieldCheck,
  FileCheck2,
  Video,
  Users,
  Radio
} from 'lucide-react';
import { Patient, TriageAssessment, UrgencyLevel, NetworkCondition, AuditScope, DemographicAgeRange, BiologicalSex } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { EdgeMLService, EdgeMLInferenceResult } from '../services/edgeML';
import { AcousticScannerSimulator } from './AcousticScannerSimulator';
import { RemoteTelemedicineModule } from './RemoteTelemedicineModule';
import { useBatteryStatus } from '../hooks/useBatteryStatus';
import { SqlcipherMonitorService } from '../services/sqlcipherMonitorService';
import { BiometricAuthService } from '../services/BiometricAuthService';

interface MobileFieldSimulatorProps {
  networkCondition: NetworkCondition;
  onAssessmentCreated: () => void;
  onOpenOfflineTour?: () => void;
  onOpenAuditModal?: (scope?: AuditScope) => void;
}

const COMMON_SYMPTOMS = [
  'High Fever (>39C)',
  'Persistent Cough',
  'Shortness of Breath',
  'Stridor / Wheezing',
  'Chest Indrawing',
  'Lethargy / Weakness',
  'Vomiting Everything',
  'Cyanosis (Bluish Lips)',
];

export const MobileFieldSimulator: React.FC<MobileFieldSimulatorProps> = ({
  networkCondition,
  onAssessmentCreated,
  onOpenOfflineTour,
  onOpenAuditModal,
}) => {
  const battery = useBatteryStatus();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  // Triage Inputs
  const [temperature, setTemperature] = useState<number>(38.9);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(44);
  const [oxygenSaturation, setOxygenSaturation] = useState<number>(91);
  const [heartRate, setHeartRate] = useState<number>(138);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'High Fever (>39C)',
    'Persistent Cough',
    'Shortness of Breath'
  ]);
  const [clinicalNotes, setClinicalNotes] = useState<string>('Bilateral rales on auscultation. Child lethargic but responsive.');

  // GPS simulated in rural clinic (e.g. Lokichoggio, Turkana)
  const [lat, setLat] = useState<number>(4.2045);
  const [lng, setLng] = useState<number>(34.3482);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(4.2);

  // Edge ML State
  const [isRunningML, setIsRunningML] = useState<boolean>(false);
  const [mlResult, setMlResult] = useState<EdgeMLInferenceResult | null>(null);

  // Submission status
  const [committedSuccess, setCommittedSuccess] = useState<string | null>(null);

  // Structured Demographic Stratification for DBSCAN Epidemiological Clustering
  const [ageRange, setAgeRange] = useState<DemographicAgeRange>('0-5');
  const [sex, setSex] = useState<BiologicalSex>('F');

  // Active view inside mobile phone: 'triage' | 'acoustic-scanner' | 'sqlite-viewer' | 'new-patient' | 'telemedicine'
  const [deviceSubTab, setDeviceSubTab] = useState<'triage' | 'acoustic-scanner' | 'sqlite-viewer' | 'new-patient' | 'telemedicine'>('triage');

  const handleApplyDiagnosisFromAcousticScanner = (result: {
    condition: string;
    confidence: number;
    urgency: 'ROUTINE_GREEN' | 'URGENT_YELLOW' | 'EMERGENCY_RED';
    symptomsToAdd: string[];
    clinicalNote: string;
    mlResult: EdgeMLInferenceResult;
  }) => {
    setMlResult(result.mlResult);
    setClinicalNotes((prev) => prev ? `${prev}\n\n${result.clinicalNote}` : result.clinicalNote);
    setSelectedSymptoms((prev) => Array.from(new Set([...prev, ...result.symptomsToAdd])));
    setDeviceSubTab('triage');
    setCommittedSuccess(`Edge ML Dual-ONNX Inferences Applied: ${result.condition} (${(result.confidence * 100).toFixed(1)}%). Review & Commit.`);
    setTimeout(() => setCommittedSuccess(null), 5000);
  };

  // New Patient Form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newBirthYear, setNewBirthYear] = useState(2022);
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [newVillage, setNewVillage] = useState('Lokichoggio Outpost');

  // SQLCipher Telemetry State
  const [sqlcipherState, setSqlcipherState] = useState(SqlcipherMonitorService.getSystemState());
  const [isBioLocked, setIsBioLocked] = useState(BiometricAuthService.isLocked());

  useEffect(() => {
    loadPatients();
    const unsub = SqlcipherMonitorService.subscribe((state) => {
      setSqlcipherState(state);
    });
    const unsubBio = BiometricAuthService.subscribe((state) => {
      setIsBioLocked(state.isLocked);
    });
    return () => {
      unsub();
      unsubBio();
    };
  }, []);

  const loadPatients = () => {
    const list = LocalDatabaseService.getPatients();
    setPatients(list);
    if (list.length > 0 && !selectedPatientId) {
      setSelectedPatientId(list[0].id);
    }
  };

  // Synchronize initial age range and biological sex whenever the selected patient changes
  useEffect(() => {
    const patient = patients.find((p) => p.id === selectedPatientId);
    if (patient) {
      if (patient.gender) {
        setSex(patient.gender);
      }
      if (patient.birth_year) {
        const approxAge = 2026 - patient.birth_year;
        if (approxAge <= 5) setAgeRange('0-5');
        else if (approxAge <= 12) setAgeRange('6-12');
        else if (approxAge <= 17) setAgeRange('13-17');
        else if (approxAge <= 49) setAgeRange('18-49');
        else if (approxAge <= 64) setAgeRange('50-64');
        else setAgeRange('65+');
      }
    }
  }, [selectedPatientId, patients]);

  const handleToggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleRunEdgeML = async () => {
    setIsRunningML(true);
    try {
      const res = await EdgeMLService.runInference({
        vitals: {
          temperature,
          respiratoryRate,
          oxygenSaturation,
          heartRate,
        },
        symptoms: selectedSymptoms,
      });
      setMlResult(res);
    } finally {
      setIsRunningML(false);
    }
  };

  const handleCreateNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName) return;

    const patientId = 'p-' + crypto.randomUUID();
    const newPat: Patient = {
      id: patientId,
      national_id_hash: 'hash-' + Math.random().toString(36).substring(2, 10),
      first_name: newFirstName,
      last_name: newLastName,
      gender: newGender,
      birth_year: newBirthYear,
      village_name: newVillage,
      cluster_zone_id: 'ZONE-NORTH-TURKANA-4',
      client_created_at: new Date().toISOString(),
      client_updated_at: new Date().toISOString(),
      server_synced_at: null,
      version: 1,
    };

    LocalDatabaseService.insertPatient(newPat);
    loadPatients();
    setSelectedPatientId(patientId);
    setDeviceSubTab('triage');
    setCommittedSuccess(`Write Operation Flow: 1. Saved to Room DB (Pending) → 2. Queued in WorkManager (Patient: ${newFirstName} ${newLastName})`);
    setTimeout(() => setCommittedSuccess(null), 4000);
    onAssessmentCreated();
  };

  const handleCommitAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    // Determine triage urgency (either from Edge ML or vital threshold)
    let urgency: UrgencyLevel = 'ROUTINE_GREEN';
    if (mlResult) {
      urgency = mlResult.triageRecommendation;
    } else if (respiratoryRate >= 40 || oxygenSaturation < 92 || temperature >= 39.2) {
      urgency = 'EMERGENCY_RED';
    } else if (respiratoryRate >= 30 || temperature >= 38.5) {
      urgency = 'URGENT_YELLOW';
    }

    const assessmentId = 't-' + crypto.randomUUID();
    const newAssessment: TriageAssessment = {
      id: assessmentId,
      patient_id: selectedPatientId,
      chw_worker_id: 'CHW-KEN-084',
      age_range: ageRange,
      sex: sex,
      temperature_celsius: parseFloat(temperature.toString()),
      respiratory_rate_bpm: parseInt(respiratoryRate.toString()),
      oxygen_saturation_pct: parseFloat(oxygenSaturation.toString()),
      heart_rate_bpm: parseInt(heartRate.toString()),
      symptoms: selectedSymptoms,
      edge_ml_inferred_condition: mlResult?.condition || 'CLINICAL_EVALUATION',
      edge_ml_confidence: mlResult?.confidence || 0.85,
      edge_ml_model_version: mlResult?.modelVersion || 'onnx-resp-int8-v2.4.1',
      triage_urgency: urgency,
      clinical_notes: clinicalNotes,
      latitude: lat + (Math.random() - 0.5) * 0.008,
      longitude: lng + (Math.random() - 0.5) * 0.008,
      altitude_meters: 630 + Math.round(Math.random() * 20),
      gps_accuracy_meters: gpsAccuracy,
      captured_at: new Date().toISOString(),
      client_created_at: new Date().toISOString(),
      server_synced_at: null, // Stored offline locally first!
      is_outbreak_flagged: temperature >= 38.5 && (respiratoryRate >= 32 || oxygenSaturation <= 92),
    };

    LocalDatabaseService.insertTriageAssessment(newAssessment);
    const cryptoState = SqlcipherMonitorService.getSystemState().crypto;
    const latencyNotice = cryptoState.latencyStatus === 'CRITICAL'
      ? ` ⚠️ High Crypto Overhead: ${cryptoState.totalTriageWriteLatencyMs}ms`
      : ` (${cryptoState.totalTriageWriteLatencyMs}ms commit)`;
    setCommittedSuccess(`Write Operation Flow: 1. Saved to SQLCipher DB${latencyNotice} → 2. Queued in SyncQueue (Assessment: ${assessmentId.slice(0, 8)}...)`);
    setTimeout(() => setCommittedSuccess(null), 4000);
    onAssessmentCreated();
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Mobile Device Frame Mockup */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md">
          {/* Simulated Mobile Device Top Status Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 text-xs flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">Frontline CHW Handheld Client</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                ARMv8 • SQLite 3.42 WAL
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <Lock className="h-3 w-3" /> SQLCipher Encrypted
              </span>
              <span className={`flex items-center gap-1 text-[11px] font-mono ${
                battery.level <= 15 ? 'text-rose-400 font-bold animate-pulse' :
                battery.level <= 25 ? 'text-amber-400 font-semibold' : 'text-slate-300'
              }`}>
                {battery.isCharging ? (
                  <BatteryCharging className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                ) : battery.level <= 15 ? (
                  <BatteryWarning className="h-3.5 w-3.5 text-rose-400" />
                ) : battery.level <= 25 ? (
                  <BatteryLow className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Battery className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{battery.level}%</span>
                {battery.isCharging && <Zap className="h-2.5 w-2.5 text-amber-300 fill-amber-300" />}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                networkCondition === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300' :
                networkCondition === 'OFFLINE' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {networkCondition}
              </span>

              {onOpenOfflineTour && (
                <button
                  type="button"
                  onClick={onOpenOfflineTour}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border ${
                    networkCondition === 'OFFLINE'
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500/40 hover:bg-rose-900/80'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="View Offline Field Ops & Reconciliation Guide"
                >
                  <span>Offline Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* Device Screen Navigation */}
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setDeviceSubTab('triage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                deviceSubTab === 'triage'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Clinical Triage Entry
            </button>

            <button
              onClick={() => setDeviceSubTab('acoustic-scanner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                deviceSubTab === 'acoustic-scanner'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Auscultation (Dual-ONNX)
            </button>

            <button
              onClick={() => setDeviceSubTab('telemedicine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                deviceSubTab === 'telemedicine'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-rose-300'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-rose-400" />
              <span>Telemedicine Link</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/30 font-mono">
                P0 Live
              </span>
            </button>

            <button
              onClick={() => setDeviceSubTab('new-patient')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                deviceSubTab === 'new-patient'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Enroll Patient
            </button>

            <button
              onClick={() => setDeviceSubTab('sqlite-viewer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                deviceSubTab === 'sqlite-viewer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Inspect Local SQLite Tables
            </button>

            {onOpenAuditModal && (
              <button
                type="button"
                onClick={() => onOpenAuditModal('ALL_CATCHMENT')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 hover:text-white cursor-pointer"
                title="Export locally stored, encrypted PDF summary of triage data & outbreak reports for rural clinic audits"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Export Audit PDF</span>
                <span className="sm:hidden">Audit PDF</span>
              </button>
            )}
          </div>

          {/* Success Banner */}
          {committedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{committedSuccess}</span>
            </div>
          )}

          {/* SUBTAB 1: CLINICAL TRIAGE ENTRY */}
          {deviceSubTab === 'triage' && (
            <form onSubmit={handleCommitAssessment} className="space-y-4 text-xs">
              {/* Patient Selection Row */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="block text-slate-400 font-medium mb-1.5">
                  Select Registered Patient (from encrypted local SQLite)
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.gender}, b. {p.birth_year}) - {p.village_name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setDeviceSubTab('new-patient')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    + Enroll New
                  </button>
                </div>

                {selectedPatient && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-4 flex-wrap">
                    <span>Village: <strong className="text-slate-300">{selectedPatient.village_name}</strong></span>
                    <span>Zone: <strong className="text-slate-300">{selectedPatient.cluster_zone_id}</strong></span>
                    <span>Sync Status: <span className="text-emerald-400 font-mono">
                      {selectedPatient.server_synced_at ? 'Synced' : 'Pending Server Sync'}
                    </span></span>
                  </div>
                )}
              </div>

              {/* Structured Demographic Fields (Epidemiological DBSCAN Cluster Stratification) */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Structured Demographic Fields (DBSCAN Cluster Input)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                    PostGIS Stratification
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Age Range Selector */}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Age Range Cohort (WHO IMCI Demographic Tiers)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: '0-5', label: '0-5 yrs', desc: 'Under-5' },
                          { id: '6-12', label: '6-12 yrs', desc: 'Child' },
                          { id: '13-17', label: '13-17 yrs', desc: 'Adolescent' },
                          { id: '18-49', label: '18-49 yrs', desc: 'Adult' },
                          { id: '50-64', label: '50-64 yrs', desc: 'Middle-Age' },
                          { id: '65+', label: '65+ yrs', desc: 'Geriatric' },
                        ] as const
                      ).map((tier) => (
                        <button
                          type="button"
                          key={tier.id}
                          onClick={() => setAgeRange(tier.id)}
                          className={`py-1.5 px-2 rounded-lg text-center transition-all border ${
                            ageRange === tier.id
                              ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-[11px] font-mono leading-tight">{tier.label}</div>
                          <div className="text-[9px] opacity-75">{tier.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Biological Sex Selector */}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Biological Sex (Sex Ratio Monitoring)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'F', label: 'Female (F)' },
                          { id: 'M', label: 'Male (M)' },
                          { id: 'OTHER', label: 'Other' },
                        ] as const
                      ).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSex(item.id)}
                          className={`py-2 px-2 rounded-lg text-center transition-all border ${
                            sex === item.id
                              ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs font-medium">{item.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* Epidemiological Context Callout */}
                    <div className="mt-2 text-[10px] p-2 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
                      {ageRange === '0-5' ? (
                        <span className="text-amber-300 font-medium flex items-center gap-1">
                          <span>⚠️</span>
                          <span><strong>WHO IMCI High-Risk Cohort:</strong> Under-5 patients receive prioritized spatial aggregation for pediatric respiratory pathogens (RSV, Bronchiolitis).</span>
                        </span>
                      ) : ageRange === '65+' ? (
                        <span className="text-purple-300 font-medium flex items-center gap-1">
                          <span>⚠️</span>
                          <span><strong>Geriatric High-Risk:</strong> Monitored for elevated SARI hospitalization and severe hypoxemia risk.</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Cohort stratified for PostGIS spatial clustering to detect age-skewed vector or waterborne outbreaks.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                    <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                    Temperature (°C)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="32"
                    max="43"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 37.0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    {temperature >= 38.5 ? <span className="text-rose-400 font-bold">High Fever (Outbreak Flag)</span> : 'Normal Range'}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                    <Wind className="h-3.5 w-3.5 text-cyan-400" />
                    Resp Rate (bpm)
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    {respiratoryRate >= 35 ? <span className="text-amber-400 font-bold">Tachypnea (&gt;35)</span> : 'Normal Rate'}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    Oxygen SpO2 (%)
                  </span>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(parseFloat(e.target.value) || 98)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    {oxygenSaturation <= 92 ? <span className="text-rose-400 font-bold">Hypoxemia (&le;92%)</span> : 'Normal Saturation'}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
                    <Heart className="h-3.5 w-3.5 text-red-400" />
                    Heart Rate (bpm)
                  </span>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    value={heartRate}
                    onChange={(e) => setHeartRate(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    {heartRate >= 130 ? <span className="text-amber-400 font-bold">Tachycardia</span> : 'Resting Rate'}
                  </div>
                </div>
              </div>

              {/* Symptoms Checklist */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="block text-slate-300 font-medium mb-2">
                  Observed Syndromic Signs & Symptoms (WHO IMCI Guidelines)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => {
                    const isChecked = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        type="button"
                        key={symptom}
                        onClick={() => handleToggleSymptom(symptom)}
                        className={`text-left p-2 rounded-lg border text-[11px] transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{symptom}</span>
                        {isChecked && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Local Edge ML Audio Spectrogram Analysis Section */}
              <div className="bg-linear-to-br from-slate-950 to-slate-900 p-3.5 rounded-xl border border-cyan-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    <span className="font-semibold text-cyan-300">
                      Edge ML: Stethoscope Audio Spectrogram Model (INT8)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      ONNX Runtime Mobile
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunEdgeML}
                    disabled={isRunningML}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs"
                  >
                    {isRunningML ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Inferring on ARM NPU...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Run Local Acoustic Inference</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 mb-2">
                  Simulates a quantized 14.8MB INT8 audio transformer running directly on mobile hardware. Computes respiratory crackle/wheeze classification without transmitting patient audio to cloud.
                </p>

                {mlResult && (
                  <div className="mt-3 p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Inference Output:</span>
                        <span className="font-bold text-cyan-300">{mlResult.condition}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        mlResult.triageRecommendation === 'EMERGENCY_RED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        mlResult.triageRecommendation === 'URGENT_YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        Triage: {mlResult.triageRecommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
                      <div>Confidence: <strong className="text-slate-200">{(mlResult.confidence * 100).toFixed(1)}%</strong></div>
                      <div>Latency: <strong className="text-slate-200">{mlResult.inferenceTimeMs}ms</strong></div>
                      <div>Backend: <strong className="text-slate-200">{mlResult.executionProvider}</strong></div>
                      <div>Peak RAM: <strong className="text-slate-200">{mlResult.memoryPeakMb}MB</strong></div>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400">Detected Features: </span>
                      {mlResult.detectedAcousticFeatures.join(' • ')}
                    </div>
                  </div>
                )}
              </div>

              {/* GPS Geotagging & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    Spatial Coordinates (Frontline Catchment)
                  </span>
                  <div className="text-slate-300 font-mono text-[11px] space-y-1">
                    <div>Lat: <strong>{lat.toFixed(4)}° N</strong>, Lng: <strong>{lng.toFixed(4)}° E</strong></div>
                    <div className="text-slate-500 text-[10px]">
                      Accuracy: ±{gpsAccuracy}m • EPSG:4326 (WGS84)
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1.5 font-medium">
                    Clinical Observations
                  </span>
                  <textarea
                    rows={2}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                    placeholder="Enter frontline notes, medications, or referral orders..."
                  />
                </div>
              </div>

              {/* Critical Secondary Triage Telemedicine Trigger */}
              {(respiratoryRate >= 36 || oxygenSaturation <= 92 || temperature >= 39.0) && (
                <div className="p-3 bg-linear-to-r from-rose-950/60 via-slate-900 to-rose-950/50 border border-rose-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-rose-400 animate-pulse" />
                      <span>Critical Vitals Detected — Physician Telemedicine Recommended</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Establish low-bandwidth H.264 camera uplink for live physician visual examination and verbal triage directives.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceSubTab('telemedicine')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs self-start sm:self-auto cursor-pointer"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Launch Telemedicine Link</span>
                  </button>
                </div>
              )}

              {/* Commit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs"
              >
                <Save className="h-4 w-4" />
                <span>Save Assessment to Encrypted SQLite & Enqueue for Sync</span>
              </button>
            </form>
          )}

          {/* SUBTAB: REMOTE TELEMEDICINE LINK */}
          {deviceSubTab === 'telemedicine' && (
            <RemoteTelemedicineModule
              networkCondition={networkCondition}
              activePatient={selectedPatient}
              vitals={{
                temperature,
                respiratoryRate,
                oxygenSaturation,
                heartRate,
              }}
              onClose={() => setDeviceSubTab('triage')}
            />
          )}

          {/* SUBTAB: ACOUSTIC LUNG AUSCULTATION (DUAL-ONNX) */}
          {deviceSubTab === 'acoustic-scanner' && (
            <AcousticScannerSimulator
              onApplyDiagnosisToTriage={handleApplyDiagnosisFromAcousticScanner}
              currentPatientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Registered Patient'}
            />
          )}

          {/* SUBTAB 2: ENROLL NEW PATIENT */}
          {deviceSubTab === 'new-patient' && (
            <form onSubmit={handleCreateNewPatient} className="space-y-4 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-semibold text-slate-200 text-xs">Offline Patient Registration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Lokale"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Epetet"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Birth Year</label>
                    <input
                      type="number"
                      value={newBirthYear}
                      onChange={(e) => setNewBirthYear(parseInt(e.target.value) || 2020)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Gender</label>
                    <select
                      value={newGender}
                      onChange={(e) => setNewGender(e.target.value as 'M' | 'F')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Village</label>
                    <input
                      type="text"
                      value={newVillage}
                      onChange={(e) => setNewVillage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Save Patient Record to SQLCipher & Return
                </button>
              </div>
            </form>
          )}

          {/* SUBTAB 3: LOCAL SQLITE TABLES INSPECTOR */}
          {deviceSubTab === 'sqlite-viewer' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    isBioLocked ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                      <span>SQLite Biometric Vault Guard</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isBioLocked ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}>
                        {isBioLocked ? 'LOCKED' : 'ARMED / ACTIVE'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Auto-locks and purges master key handle when app is backgrounded.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isBioLocked ? (
                    <button
                      type="button"
                      onClick={() => BiometricAuthService.triggerChallenge()}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors animate-pulse"
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      <span>Unlock Vault</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => BiometricAuthService.simulateBackgroundResume(15)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Simulate switching out of app and resuming"
                    >
                      <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Simulate Resume</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Local SQLite Tables (Decrypted Read View):</span>
                <span className="text-[10px] text-slate-500 font-mono">Database: /data/user/0/app/databases/clinical.db</span>
              </div>

              {isBioLocked ? (
                <div className="bg-slate-950 p-6 rounded-xl border border-rose-500/30 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto animate-pulse">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div className="text-white font-bold text-sm">SQLite Database Vault Locked</div>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    The application resumed from background. SQLCipher master key handle has been purged from RAM to prevent unauthorized extraction.
                  </p>
                  <button
                    type="button"
                    onClick={() => BiometricAuthService.triggerChallenge()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 mx-auto transition-colors shadow-md"
                  >
                    <Fingerprint className="h-4 w-4" />
                    <span>Authenticate with Fingerprint / PIN</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 font-mono text-[11px] overflow-x-auto max-h-[400px]">
                <div>
                  <div className="text-emerald-400 font-bold mb-1">TABLE: triage_assessments (Top 5 Rows)</div>
                  <table className="w-full text-left text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                        <th className="py-1 px-2">ID</th>
                        <th className="py-1 px-2">Patient</th>
                        <th className="py-1 px-2">Demographics</th>
                        <th className="py-1 px-2">Temp</th>
                        <th className="py-1 px-2">SpO2</th>
                        <th className="py-1 px-2">Urgency</th>
                        <th className="py-1 px-2">Server Synced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LocalDatabaseService.getTriageAssessments().slice(0, 5).map((t) => (
                        <tr key={t.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="py-1 px-2 text-slate-400">{t.id.slice(0, 8)}...</td>
                          <td className="py-1 px-2">{t.patient_id.slice(0, 8)}...</td>
                          <td className="py-1 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 text-[10px] font-mono">
                              {t.age_range || '6-12'} • {t.sex || 'F'}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-rose-300">{t.temperature_celsius}°C</td>
                          <td className="py-1 px-2">{t.oxygen_saturation_pct}%</td>
                          <td className="py-1 px-2">
                            <span className={`px-1 rounded text-[9px] ${
                              t.triage_urgency === 'EMERGENCY_RED' ? 'bg-rose-500/20 text-rose-300' :
                              t.triage_urgency === 'URGENT_YELLOW' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {t.triage_urgency}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-[10px]">
                            {t.server_synced_at ? (
                              <span className="text-emerald-400">ACK (Synced)</span>
                            ) : (
                              <span className="text-amber-400 font-bold">NULL (Pending Sync)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-amber-400 font-bold mb-1">TABLE: sync_queue (Active Dispatch Items)</div>
                  {LocalDatabaseService.getSyncQueue().length === 0 ? (
                    <div className="text-slate-500 py-1 text-[10px]">Queue is empty. All local records are in sync.</div>
                  ) : (
                    <table className="w-full text-left text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                          <th className="py-1 px-2">Queue ID</th>
                          <th className="py-1 px-2">Entity</th>
                          <th className="py-1 px-2">Mutation</th>
                          <th className="py-1 px-2">Status</th>
                          <th className="py-1 px-2">Retries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {LocalDatabaseService.getSyncQueue().map((q) => (
                          <tr key={q.queue_id} className="border-b border-slate-900">
                            <td className="py-1 px-2 text-slate-400">{q.queue_id.slice(0, 8)}...</td>
                            <td className="py-1 px-2">{q.entity_type}</td>
                            <td className="py-1 px-2">{q.mutation_type}</td>
                            <td className="py-1 px-2">
                              <span className={`px-1 rounded text-[9px] ${
                                q.status === 'ACKNOWLEDGED' ? 'bg-emerald-500/20 text-emerald-300' :
                                q.status === 'FAILED_RETRY' ? 'bg-rose-500/20 text-rose-300' :
                                'bg-amber-500/20 text-amber-300'
                              }`}>
                                {q.status}
                              </span>
                            </td>
                            <td className="py-1 px-2">{q.retry_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Frontline Clinical Decision Rules & Edge ML Explanations */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-4">
        {/* Clinical Safety Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Lock className="h-4 w-4" />
            <span>Offline-First Clinical Safety Guarantees</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            In rural outposts with 0 bars of GSM connectivity, healthcare workers cannot afford app crashes or data loss. Every patient assessment is committed immediately to local flash memory using atomic SQL transactions.
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-start gap-2 text-[11px]">
              <span className="text-emerald-400 font-bold">•</span>
              <span className="text-slate-300">
                <strong>Append-Only Immutability:</strong> Assessments cannot be modified once written, adhering to medical-legal audit requirements.
              </span>
            </div>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="text-cyan-400 font-bold">•</span>
              <span className="text-slate-300">
                <strong>Deterministic Local Inference:</strong> Audio spectrogram AI evaluates breath sounds right on device in 65ms without sending audio payloads over slow 2G cell networks.
              </span>
            </div>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="text-amber-400 font-bold">•</span>
              <span className="text-slate-300">
                <strong>Idempotent Sync Tokens:</strong> If a sync request drops mid-flight on a spotty cell tower, retrying the packet will not create duplicate patient records.
              </span>
            </div>
          </div>
        </div>

        {/* Sync Status Quick Action */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Local Database State</span>
            <button
              onClick={() => {
                LocalDatabaseService.resetToSeed();
                loadPatients();
                onAssessmentCreated();
              }}
              className="text-[10px] text-slate-400 hover:text-rose-300 underline font-mono"
            >
              Reset Seed Data
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Registered Patients</span>
              <span className="text-white font-bold text-sm">{patients.length}</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Total Triage Records</span>
              <span className="text-white font-bold text-sm">{LocalDatabaseService.getTriageAssessments().length}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span>Pending Sync Queue:</span>
            <span className="font-bold text-amber-400 font-mono">
              {LocalDatabaseService.getSyncQueue().filter(q => q.status === 'PENDING' || q.status === 'FAILED_RETRY').length} records
            </span>
          </div>
        </div>

        {/* SQLCipher Storage & Crypto Latency Telemetry Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Lock className={`h-3.5 w-3.5 ${sqlcipherState.crypto.latencyStatus === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>SQLCipher Crypto Engine</span>
            </span>
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
              sqlcipherState.crypto.latencyStatus === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : sqlcipherState.crypto.latencyStatus === 'WARNING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {sqlcipherState.crypto.latencyStatus === 'CRITICAL' ? 'LAG IMPACTED' : sqlcipherState.crypto.latencyStatus === 'WARNING' ? 'ELEVATED' : 'NOMINAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Encrypted Disk Size</span>
              <span className="text-white font-bold">{sqlcipherState.disk.totalFileSizeFormatted}</span>
              <span className="text-slate-500 text-[9px] block">{sqlcipherState.disk.totalPageCount} pgs • 4KB</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Triage Write Latency</span>
              <span className={`font-bold ${sqlcipherState.crypto.latencyStatus === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {sqlcipherState.crypto.totalTriageWriteLatencyMs} ms
              </span>
              <span className="text-slate-500 text-[9px] block">+{sqlcipherState.crypto.encryptionOverheadMs}ms crypto</span>
            </div>
          </div>

          {sqlcipherState.crypto.latencyStatus === 'CRITICAL' && (
            <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded text-[10px] text-rose-300 leading-snug">
              ⚠️ Encryption overhead exceeds 100ms. Consider adjusting PRAGMA kdf_iter or running VACUUM from the footer status monitor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
