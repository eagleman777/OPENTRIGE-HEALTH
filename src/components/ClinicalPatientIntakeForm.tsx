import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  Thermometer, 
  Heart, 
  Wind, 
  Activity, 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  ShieldAlert, 
  RefreshCw,
  Sparkles,
  Stethoscope,
  Clock,
  Fingerprint,
  Calendar,
  Compass,
  Search,
  X,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Copy
} from 'lucide-react';
import { 
  Patient, 
  TriageAssessment, 
  DemographicAgeRange, 
  BiologicalSex, 
  UrgencyLevel, 
  NetworkCondition 
} from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { SqlcipherMonitorService } from '../services/sqlcipherMonitorService';

export interface ClinicalPatientIntakeFormProps {
  networkCondition?: NetworkCondition;
  onIntakeCompleted?: (patient: Patient, assessment: TriageAssessment) => void;
  onCancel?: () => void;
}

const COMMON_VILLAGES = [
  'Lokichoggio Outpost (Zone 4)',
  'Kakuma Refugee Hub - Zone 1',
  'Kakuma Refugee Hub - Zone 2',
  'Turkana West - Kalobeyei',
  'Lodwar Peri-Urban Outpost',
  'Oropoi Border Settlement',
];

const SYMPTOM_OPTIONS = [
  { id: 'fever', label: 'High Fever (>38.5°C)', category: 'febrile' },
  { id: 'cough', label: 'Persistent Productive Cough', category: 'respiratory' },
  { id: 'sob', label: 'Shortness of Breath (Dyspnea)', category: 'respiratory' },
  { id: 'stridor', label: 'Inspiratory Stridor / Wheeze', category: 'respiratory' },
  { id: 'indrawing', label: 'Subcostal Chest Indrawing', category: 'critical' },
  { id: 'cyanosis', label: 'Central Cyanosis (Bluish Lips)', category: 'critical' },
  { id: 'lethargy', label: 'Severe Lethargy / Altered Sensorium', category: 'critical' },
  { id: 'vomiting', label: 'Unable to Drink / Vomiting Everything', category: 'danger' },
  { id: 'diarrhea', label: 'Profuse Watery Diarrhea', category: 'systemic' },
  { id: 'convulsions', label: 'Febrile Convulsions', category: 'critical' },
];

export const ClinicalPatientIntakeForm: React.FC<ClinicalPatientIntakeFormProps> = ({
  networkCondition = 'ONLINE',
  onIntakeCompleted,
  onCancel,
}) => {
  // Search & Follow-up State
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isCopiedFromPrior, setIsCopiedFromPrior] = useState(false);

  // Patient Selection / Registration Mode
  const [intakeMode, setIntakeMode] = useState<'NEW_PATIENT' | 'EXISTING_PATIENT'>('NEW_PATIENT');
  const [existingPatients, setExistingPatients] = useState<Patient[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [allAssessments, setAllAssessments] = useState<TriageAssessment[]>([]);

  // Demographic State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<BiologicalSex>('M');
  const [ageYears, setAgeYears] = useState<number>(3);
  const [demographicAgeRange, setDemographicAgeRange] = useState<DemographicAgeRange>('0-5');
  const [villageName, setVillageName] = useState(COMMON_VILLAGES[0]);
  const [chwWorkerId, setChwWorkerId] = useState('CHW-KEN-084');

  // Vitals State
  const [temperature, setTemperature] = useState<number>(38.8);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(44);
  const [oxygenSaturation, setOxygenSaturation] = useState<number>(91);
  const [heartRate, setHeartRate] = useState<number>(132);
  const [systolicBp, setSystolicBp] = useState<number>(95);
  const [diastolicBp, setDiastolicBp] = useState<number>(60);
  const [weightKg, setWeightKg] = useState<number>(12.5);
  const [muacMm, setMuacMm] = useState<number>(120);

  // Symptoms & Clinical Notes
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'High Fever (>38.5°C)',
    'Persistent Productive Cough',
    'Subcostal Chest Indrawing',
  ]);
  const [clinicalNotes, setClinicalNotes] = useState(
    'Pediatric patient presenting with rapid breathing, chest indrawing, and high fever for 3 days. Mother notes poor feeding.'
  );

  // Geospatial Coordinates (Turkana catchment center)
  const [latitude, setLatitude] = useState<number>(4.2185);
  const [longitude, setLongitude] = useState<number>(34.3482);
  const [altitude, setAltitude] = useState<number>(640);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(3.8);

  // Status & Transaction Feed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
    subText: string;
  } | null>(null);

  // Load existing patients and all assessments from SQLite
  const reloadDbData = () => {
    const list = LocalDatabaseService.getPatients();
    setExistingPatients(list);
    const assessments = LocalDatabaseService.getTriageAssessments();
    setAllAssessments(assessments);
    if (list.length > 0 && !selectedExistingId) {
      setSelectedExistingId(list[0].id);
    }
  };

  useEffect(() => {
    reloadDbData();
  }, []);

  // Sync Age with DemographicAgeRange
  useEffect(() => {
    if (ageYears <= 5) setDemographicAgeRange('0-5');
    else if (ageYears <= 12) setDemographicAgeRange('6-12');
    else if (ageYears <= 17) setDemographicAgeRange('13-17');
    else if (ageYears <= 49) setDemographicAgeRange('18-49');
    else if (ageYears <= 64) setDemographicAgeRange('50-64');
    else setDemographicAgeRange('65+');
  }, [ageYears]);

  // Sync selected existing patient to demographic form fields
  useEffect(() => {
    if (intakeMode === 'EXISTING_PATIENT' && selectedExistingId) {
      const p = existingPatients.find((item) => item.id === selectedExistingId);
      if (p) {
        setFirstName(p.first_name);
        setLastName(p.last_name);
        setGender(p.gender);
        const currentYear = new Date().getFullYear();
        const computedAge = Math.max(0, currentYear - p.birth_year);
        setAgeYears(computedAge);
        setVillageName(p.village_name);
      }
    }
  }, [intakeMode, selectedExistingId, existingPatients]);

  // Filtered patients based on search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return existingPatients.filter((p) => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      const idMatch = p.id.toLowerCase().includes(q);
      const hashMatch = p.national_id_hash?.toLowerCase().includes(q);
      const villageMatch = p.village_name?.toLowerCase().includes(q);
      return (
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        idMatch ||
        hashMatch ||
        villageMatch
      );
    });
  }, [searchQuery, existingPatients]);

  // Active selected patient object
  const activeSelectedPatient = useMemo(() => {
    if (intakeMode !== 'EXISTING_PATIENT' || !selectedExistingId) return null;
    return existingPatients.find((p) => p.id === selectedExistingId) || null;
  }, [intakeMode, selectedExistingId, existingPatients]);

  // Prior triage encounters for active patient, ordered newest first
  const activePatientPriorAssessments = useMemo(() => {
    if (!activeSelectedPatient) return [];
    return allAssessments
      .filter((a) => a.patient_id === activeSelectedPatient.id)
      .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
  }, [activeSelectedPatient, allAssessments]);

  // Latest prior assessment for follow-up comparison
  const latestPriorAssessment = activePatientPriorAssessments[0] || null;

  // Handler: Select a patient from search results for follow-up
  const handleSelectPatientForFollowup = (patient: Patient) => {
    setIntakeMode('EXISTING_PATIENT');
    setSelectedExistingId(patient.id);
    setSearchQuery('');
    setFeedback({
      type: 'SUCCESS',
      message: `Pulled up prior record: ${patient.first_name} ${patient.last_name}`,
      subText: `Patient ID: ${patient.id.slice(0, 8)}... · ${activePatientPriorAssessments.length || 1} prior encounter(s) in SQLite. Form ready for follow-up evaluation.`,
    });
  };

  // Handler: Copy vitals from last encounter as baseline
  const handleCopyPriorVitals = () => {
    if (!latestPriorAssessment) return;
    setTemperature(latestPriorAssessment.temperature_celsius);
    setRespiratoryRate(latestPriorAssessment.respiratory_rate_bpm);
    setOxygenSaturation(latestPriorAssessment.oxygen_saturation_pct);
    setHeartRate(latestPriorAssessment.heart_rate_bpm);
    setSelectedSymptoms([...latestPriorAssessment.symptoms]);
    setClinicalNotes(
      `Follow-up visit. Prior condition: ${latestPriorAssessment.edge_ml_inferred_condition}. Previous notes: "${latestPriorAssessment.clinical_notes}". Current evaluation: `
    );
    setIsCopiedFromPrior(true);
    setTimeout(() => setIsCopiedFromPrior(false), 3000);
  };

  // Dynamic Triage Urgency Calculation (WHO IMCI & Vital Thresholds)
  const isEmergency =
    oxygenSaturation <= 90 ||
    respiratoryRate >= (demographicAgeRange === '0-5' ? 50 : 38) ||
    temperature >= 39.5 ||
    selectedSymptoms.some((s) => s.includes('Cyanosis') || s.includes('Indrawing') || s.includes('Convulsions'));

  const isUrgent =
    !isEmergency &&
    (oxygenSaturation <= 93 ||
      respiratoryRate >= (demographicAgeRange === '0-5' ? 40 : 30) ||
      temperature >= 38.5 ||
      selectedSymptoms.some((s) => s.includes('Shortness of Breath') || s.includes('Stridor')));

  const triageUrgency: UrgencyLevel = isEmergency
    ? 'EMERGENCY_RED'
    : isUrgent
    ? 'URGENT_YELLOW'
    : 'ROUTINE_GREEN';

  // Outbreak cluster trigger criterion (Febrile respiratory syndrome)
  const isOutbreakFlagged =
    temperature >= 38.5 &&
    (respiratoryRate >= (demographicAgeRange === '0-5' ? 40 : 30) || oxygenSaturation <= 92);

  // Toggle symptom selection
  const handleToggleSymptom = (label: string) => {
    if (selectedSymptoms.includes(label)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== label));
    } else {
      setSelectedSymptoms([...selectedSymptoms, label]);
    }
  };

  // Preset scenarios for rapid field testing
  const handleApplyPreset = (preset: 'PEDIATRIC_PNEUMONIA' | 'ADULT_FEBRILE' | 'ROUTINE_WELLNESS') => {
    if (preset === 'PEDIATRIC_PNEUMONIA') {
      setIntakeMode('NEW_PATIENT');
      setFirstName('Amina');
      setLastName('Ekaale');
      setGender('F');
      setAgeYears(2);
      setVillageName('Lokichoggio Outpost (Zone 4)');
      setTemperature(39.1);
      setRespiratoryRate(48);
      setOxygenSaturation(89);
      setHeartRate(145);
      setWeightKg(10.8);
      setMuacMm(118);
      setSelectedSymptoms([
        'High Fever (>38.5°C)',
        'Persistent Productive Cough',
        'Subcostal Chest Indrawing',
        'Inspiratory Stridor / Wheeze',
      ]);
      setClinicalNotes(
        'Severe acute lower respiratory presentation in 2yo female. Bilateral subcostal retractions, grunting, oxygen desaturation to 89%.'
      );
    } else if (preset === 'ADULT_FEBRILE') {
      setIntakeMode('NEW_PATIENT');
      setFirstName('Ezekiel');
      setLastName('Lopeyok');
      setGender('M');
      setAgeYears(34);
      setVillageName('Kakuma Refugee Hub - Zone 2');
      setTemperature(38.9);
      setRespiratoryRate(32);
      setOxygenSaturation(93);
      setHeartRate(105);
      setWeightKg(62);
      setMuacMm(240);
      setSelectedSymptoms([
        'High Fever (>38.5°C)',
        'Persistent Productive Cough',
        'Shortness of Breath (Dyspnea)',
      ]);
      setClinicalNotes(
        'Adult male presenting with acute febrile respiratory illness, fatigue, and pleuritic chest discomfort for 4 days.'
      );
    } else {
      setIntakeMode('NEW_PATIENT');
      setFirstName('Faith');
      setLastName('Chebet');
      setGender('F');
      setAgeYears(8);
      setVillageName('Turkana West - Kalobeyei');
      setTemperature(36.8);
      setRespiratoryRate(20);
      setOxygenSaturation(98);
      setHeartRate(78);
      setWeightKg(24.5);
      setMuacMm(165);
      setSelectedSymptoms([]);
      setClinicalNotes('Routine pediatric health surveillance visit. Clear lung fields, normal vitals, no acute distress.');
    }
  };

  // Commit Transaction to SQLite
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const nowIso = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - ageYears;

      let patient: Patient;

      if (intakeMode === 'NEW_PATIENT') {
        const patientId = crypto.randomUUID();
        const nationalHash = nationalId.trim()
          ? `hash-${btoa(nationalId.trim()).slice(0, 16)}`
          : `chw-anon-${patientId.slice(0, 8)}`;

        patient = {
          id: patientId,
          national_id_hash: nationalHash,
          first_name: firstName.trim() || 'Unknown',
          last_name: lastName.trim() || 'Patient',
          gender,
          birth_year: birthYear,
          village_name: villageName,
          cluster_zone_id: 'ZONE-TURKANA-NORTH',
          client_created_at: nowIso,
          client_updated_at: nowIso,
          server_synced_at: null,
          version: 1,
        };

        // Commit new patient to SQLite
        LocalDatabaseService.insertPatient(patient);
      } else {
        const found = existingPatients.find((p) => p.id === selectedExistingId);
        if (!found) {
          throw new Error('Selected existing patient record not found in SQLite store.');
        }
        patient = found;
      }

      // Construct Triage Assessment Record
      const assessmentId = crypto.randomUUID();
      const isFollowUp = activePatientPriorAssessments.length > 0;
      const assessment: TriageAssessment = {
        id: assessmentId,
        patient_id: patient.id,
        chw_worker_id: chwWorkerId,
        age_range: demographicAgeRange,
        sex: gender,
        temperature_celsius: parseFloat(temperature.toFixed(1)),
        respiratory_rate_bpm: Math.round(respiratoryRate),
        oxygen_saturation_pct: parseFloat(oxygenSaturation.toFixed(1)),
        heart_rate_bpm: Math.round(heartRate),
        symptoms: selectedSymptoms,
        edge_ml_inferred_condition: isEmergency
          ? 'Severe Lower Respiratory Infection (Pneumonia/Hypoxia)'
          : isUrgent
          ? 'Acute Febrile Respiratory Syndrome'
          : 'Normal Clinical Baseline',
        edge_ml_confidence: isEmergency ? 0.94 : isUrgent ? 0.88 : 0.92,
        edge_ml_model_version: 'onnx-resp-int8-v2.4.1',
        triage_urgency: triageUrgency,
        clinical_notes: clinicalNotes,
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
        altitude_meters: Math.round(altitude),
        gps_accuracy_meters: parseFloat(gpsAccuracy.toFixed(1)),
        captured_at: nowIso,
        client_created_at: nowIso,
        server_synced_at: null,
        is_outbreak_flagged: isOutbreakFlagged,
      };

      // Commit assessment to SQLite (atomic transaction with sync queue & event log)
      LocalDatabaseService.insertTriageAssessment(assessment);

      // Record simulated write latency
      SqlcipherMonitorService.updateLatency(16, 5);

      // Refresh local cache
      reloadDbData();

      setFeedback({
        type: 'SUCCESS',
        message: isFollowUp
          ? `Follow-up encounter #${activePatientPriorAssessments.length + 1} committed to SQLite (ID: ${assessmentId.slice(0, 8)})`
          : `Intake record committed to local SQLite database (ID: ${assessmentId.slice(0, 8)})`,
        subText: `${patient.first_name} ${patient.last_name} · ${demographicAgeRange} · ${triageUrgency.replace('_', ' ')} · Queued in local outbox for zero-trust sync`,
      });

      if (onIntakeCompleted) {
        onIntakeCompleted(patient, assessment);
      }

      // Reset form if in new patient mode
      if (intakeMode === 'NEW_PATIENT') {
        setFirstName('');
        setLastName('');
        setNationalId('');
      }
    } catch (err: any) {
      setFeedback({
        type: 'ERROR',
        message: 'Failed to commit intake record to SQLite',
        subText: err.message || 'Unknown database storage error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs text-slate-200">
      {/* Precision Top Telemetry Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm sm:text-base tracking-tight">Clinical Patient Intake</h2>
              <span className="font-mono text-[10px] text-slate-400">·</span>
              <span className="font-mono text-[11px] text-emerald-400 font-semibold">SQLite Encrypted Store</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Captures structured demographic stratification and high-resolution vitals for PostGIS DBSCAN surveillance
            </p>
          </div>
        </div>

        {/* Rapid Simulation Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset('PEDIATRIC_PNEUMONIA')}
            className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded text-[10px] font-mono font-medium transition-colors"
            title="Load high-risk pediatric pneumonia scenario"
          >
            Pediatric Surge
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('ADULT_FEBRILE')}
            className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 rounded text-[10px] font-mono font-medium transition-colors"
            title="Load adult febrile illness scenario"
          >
            Adult Febrile
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('ROUTINE_WELLNESS')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
            title="Load baseline healthy checkup"
          >
            Baseline
          </button>
        </div>
      </div>

      {/* Persistent SQLite Database Search Bar for Follow-up Visits */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Search className="h-4 w-4 text-cyan-400" />
            <span>Search Local SQLite Database for Patient Follow-up</span>
          </label>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Registered Patients: <strong className="text-white">{existingPatients.length}</strong></span>
            <span>·</span>
            <span>Recorded Encounters: <strong className="text-white">{allAssessments.length}</strong></span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient ID (e.g. p-01a4e8d2), name (Amina, Lokuruka), or registry hash..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors shadow-inner font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Search Shortcut Chips */}
        {!searchQuery && existingPatients.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500 text-[10px] font-mono mr-1">Quick Select:</span>
            {existingPatients.slice(0, 5).map((p) => {
              const visitsCount = allAssessments.filter((a) => a.patient_id === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatientForFollowup(p)}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-mono text-[10px]"
                >
                  <span>{p.first_name} {p.last_name}</span>
                  <span className="text-slate-500">({visitsCount} visits)</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Drawer */}
        {searchQuery.trim().length > 0 && (
          <div className="mt-2 bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800/80 pb-1.5">
              <span>{searchResults.length} SQLite matches found for "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white"
              >
                Close Results
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-slate-400 text-xs">No registered patients match your search query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIntakeMode('NEW_PATIENT');
                    const parts = searchQuery.trim().split(' ');
                    setFirstName(parts[0] || '');
                    setLastName(parts.slice(1).join(' ') || '');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register "{searchQuery}" as New Patient</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((patient) => {
                  const patientVisits = allAssessments
                    .filter((a) => a.patient_id === patient.id)
                    .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
                  const lastVisit = patientVisits[0];
                  const currentYear = new Date().getFullYear();
                  const age = currentYear - patient.birth_year;

                  return (
                    <div
                      key={patient.id}
                      className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-xs font-semibold">
                            {patient.first_name} {patient.last_name}
                          </strong>
                          <span className="text-[10px] font-mono text-slate-400">
                            · {patient.gender} · Born {patient.birth_year} (~{age}y)
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {patientVisits.length} prior encounter{patientVisits.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-3 flex-wrap">
                          <span>Village: <span className="text-slate-300">{patient.village_name}</span></span>
                          <span>·</span>
                          <span>ID: <span className="text-slate-300">{patient.id.slice(0, 12)}...</span></span>
                          {lastVisit && (
                            <>
                              <span>·</span>
                              <span>
                                Last Encounter: <strong className="text-slate-200">{new Date(lastVisit.captured_at).toLocaleDateString()}</strong>
                              </span>
                              <span className={`px-1 rounded text-[9px] font-bold ${
                                lastVisit.triage_urgency === 'EMERGENCY_RED' ? 'text-rose-400 bg-rose-950/40' :
                                lastVisit.triage_urgency === 'URGENT_YELLOW' ? 'text-amber-400 bg-amber-950/40' :
                                'text-emerald-400 bg-emerald-950/40'
                              }`}>
                                {lastVisit.triage_urgency.replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPatientForFollowup(patient)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Pull Up for Follow-up</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Follow-up Clinical Context Banner (Active when patient is selected) */}
        {intakeMode === 'EXISTING_PATIENT' && activeSelectedPatient && (
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                <div>
                  <h4 className="font-semibold text-white text-xs">
                    Follow-up Encounter #{activePatientPriorAssessments.length + 1} for {activeSelectedPatient.first_name} {activeSelectedPatient.last_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Patient ID: {activeSelectedPatient.id} · Village: {activeSelectedPatient.village_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {latestPriorAssessment && (
                  <button
                    type="button"
                    onClick={handleCopyPriorVitals}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                    title="Pre-populate vitals with values from the last clinical visit to track patient progression"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{isCopiedFromPrior ? 'Baseline Copied!' : 'Copy Last Visit Baseline'}</span>
                  </button>
                )}

                {activePatientPriorAssessments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(!showHistoryModal)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Timeline ({activePatientPriorAssessments.length})</span>
                    {showHistoryModal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Latest Prior Encounter Snapshot Card */}
            {latestPriorAssessment ? (
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    Previous Encounter on {new Date(latestPriorAssessment.captured_at).toLocaleString()} (CHW: {latestPriorAssessment.chw_worker_id})
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    latestPriorAssessment.triage_urgency === 'EMERGENCY_RED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : latestPriorAssessment.triage_urgency === 'URGENT_YELLOW'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {latestPriorAssessment.triage_urgency.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] bg-slate-950 p-2 rounded border border-slate-800">
                  <div>Temp: <strong className="text-rose-400">{latestPriorAssessment.temperature_celsius}°C</strong></div>
                  <div>Resp. Rate: <strong className="text-cyan-400">{latestPriorAssessment.respiratory_rate_bpm}/m</strong></div>
                  <div>SpO2: <strong className="text-emerald-400">{latestPriorAssessment.oxygen_saturation_pct}%</strong></div>
                  <div>Pulse: <strong className="text-amber-400">{latestPriorAssessment.heart_rate_bpm} bpm</strong></div>
                </div>

                <div className="text-[10px] text-slate-300">
                  <span className="text-slate-500 font-mono">Prior Diagnosis: </span>
                  <strong>{latestPriorAssessment.edge_ml_inferred_condition}</strong>
                </div>

                {latestPriorAssessment.clinical_notes && (
                  <p className="text-[10px] text-slate-400 italic">
                    "{latestPriorAssessment.clinical_notes}"
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No prior visits recorded for this patient. This encounter will establish their initial clinical baseline.
              </p>
            )}

            {/* Expandable Longitudinal Timeline of All Prior Encounters */}
            {showHistoryModal && activePatientPriorAssessments.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h5 className="font-semibold text-white text-[11px] flex items-center gap-1.5 font-mono">
                  <History className="h-3 w-3 text-cyan-400" />
                  <span>Complete Longitudinal Encounter Record (SQLite):</span>
                </h5>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activePatientPriorAssessments.map((enc, idx) => (
                    <div
                      key={enc.id}
                      className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-slate-200">
                          Visit #{activePatientPriorAssessments.length - idx} · {new Date(enc.captured_at).toLocaleDateString()}
                        </span>
                        <span className="text-slate-400">{enc.triage_urgency.replace('_', ' ')}</span>
                      </div>
                      <div className="text-slate-400 font-mono">
                        {enc.temperature_celsius}°C · {enc.respiratory_rate_bpm} bpm RR · {enc.oxygen_saturation_pct}% SpO2 · {enc.heart_rate_bpm} HR
                      </div>
                      <div className="text-slate-300">
                        {enc.edge_ml_inferred_condition}
                      </div>
                      {enc.clinical_notes && (
                        <div className="text-slate-500 italic">
                          Notes: {enc.clinical_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 1: Patient Demographic Enclave */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="font-semibold text-white text-xs flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span>01. Demographic Profile & Identity</span>
            </h3>

            {/* Mode Toggle Button Group */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setIntakeMode('NEW_PATIENT')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  intakeMode === 'NEW_PATIENT'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Patient
              </button>
              <button
                type="button"
                onClick={() => setIntakeMode('EXISTING_PATIENT')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  intakeMode === 'EXISTING_PATIENT'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Existing ({existingPatients.length})
              </button>
            </div>
          </div>

          {intakeMode === 'EXISTING_PATIENT' ? (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-slate-400 block">Select Registered Patient Record:</label>
                <span className="text-[10px] text-cyan-400 font-mono">Use search bar above for instant lookup</span>
              </div>
              <select
                value={selectedExistingId}
                onChange={(e) => setSelectedExistingId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                {existingPatients.map((p) => {
                  const visits = allAssessments.filter((a) => a.patient_id === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.gender}, Born {p.birth_year}) · {p.village_name} · [{visits} visits]
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Lokuruka"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Ekal"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Biological Sex *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as BiologicalSex)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="OTHER">Other / Undisclosed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Age in Years: <strong className="text-white font-mono">{ageYears}</strong>
                </label>
                <input
                  type="number"
                  min={0}
                  max={110}
                  value={ageYears}
                  onChange={(e) => setAgeYears(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* Demographic Stratification Selector */}
              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1">
                  Epidemiological Age Cohort (DBSCAN Classification):
                </label>
                <div className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['0-5', '6-12', '13-17', '18-49', '50-64', '65+'] as DemographicAgeRange[]).map((range) => {
                    const isSelected = demographicAgeRange === range;
                    return (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setDemographicAgeRange(range)}
                        className={`py-1.5 text-center font-mono rounded text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {range}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Catchment Settlement / Village</label>
                <select
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                >
                  {COMMON_VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">National / Registry ID (Optional)</label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="e.g. KEN-84920412"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Clinical Vitals Capture */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="font-semibold text-white text-xs flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>02. Objective Clinical Vitals</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              WHO IMCI Thresholds Monitored
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Temperature */}
            <div className={`p-3 rounded-xl border transition-colors ${
              temperature >= 38.5
                ? 'bg-rose-950/20 border-rose-800/50'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-rose-400" />
                  Temperature
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-500">°C</span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  step="0.1"
                  min={34}
                  max={43}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 37.0)}
                  className="w-20 bg-transparent font-mono text-2xl font-bold text-white focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">°C</span>
              </div>
              <span className={`text-[10px] font-mono mt-1 block ${
                temperature >= 39.5
                  ? 'text-rose-400 font-bold'
                  : temperature >= 38.5
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {temperature >= 39.5 ? 'Hyperpyrexia' : temperature >= 38.5 ? 'High Fever' : 'Normal Range'}
              </span>
            </div>

            {/* Respiratory Rate */}
            <div className={`p-3 rounded-xl border transition-colors ${
              respiratoryRate >= 40
                ? 'bg-rose-950/20 border-rose-800/50'
                : respiratoryRate >= 30
                ? 'bg-amber-950/20 border-amber-800/50'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Wind className="h-3 w-3 text-cyan-400" />
                  Resp. Rate
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-500">BPM</span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(parseInt(e.target.value) || 20)}
                  className="w-20 bg-transparent font-mono text-2xl font-bold text-white focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">/min</span>
              </div>
              <span className={`text-[10px] font-mono mt-1 block ${
                respiratoryRate >= 40
                  ? 'text-rose-400 font-bold'
                  : respiratoryRate >= 30
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {respiratoryRate >= 40 ? 'Severe Tachypnea' : respiratoryRate >= 30 ? 'Elevated' : 'Eupnea'}
              </span>
            </div>

            {/* SpO2 */}
            <div className={`p-3 rounded-xl border transition-colors ${
              oxygenSaturation <= 90
                ? 'bg-rose-950/20 border-rose-800/50'
                : oxygenSaturation <= 93
                ? 'bg-amber-950/20 border-amber-800/50'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Activity className="h-3 w-3 text-blue-400" />
                  Oxygen Saturation
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-500">SpO2</span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={oxygenSaturation}
                  onChange={(e) => setOxygenSaturation(parseFloat(e.target.value) || 98)}
                  className="w-20 bg-transparent font-mono text-2xl font-bold text-white focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">%</span>
              </div>
              <span className={`text-[10px] font-mono mt-1 block ${
                oxygenSaturation <= 90
                  ? 'text-rose-400 font-bold'
                  : oxygenSaturation <= 93
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {oxygenSaturation <= 90 ? 'Severe Hypoxia' : oxygenSaturation <= 93 ? 'Moderate Hypoxia' : 'Adequate'}
              </span>
            </div>

            {/* Heart Rate */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Heart className="h-3 w-3 text-rose-400" />
                  Pulse Rate
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-500">BPM</span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={40}
                  max={220}
                  value={heartRate}
                  onChange={(e) => setHeartRate(parseInt(e.target.value) || 80)}
                  className="w-20 bg-transparent font-mono text-2xl font-bold text-white focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">bpm</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                {heartRate > 120 ? 'Tachycardia' : heartRate < 60 ? 'Bradycardia' : 'Normocardia'}
              </span>
            </div>
          </div>

          {/* Secondary Vitals Strip (BP, Weight, MUAC) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[10px] text-slate-400 font-mono block">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(parseInt(e.target.value) || 100)}
                className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[10px] text-slate-400 font-mono block">Diastolic BP (mmHg)</label>
              <input
                type="number"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(parseInt(e.target.value) || 65)}
                className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[10px] text-slate-400 font-mono block">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 10)}
                className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
              />
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="text-[10px] text-slate-400 font-mono block">MUAC (mm)</label>
              <input
                type="number"
                value={muacMm}
                onChange={(e) => setMuacMm(parseInt(e.target.value) || 125)}
                className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
              />
              <span className={`text-[9px] font-mono block mt-0.5 ${
                muacMm < 115 ? 'text-rose-400 font-bold' : muacMm <= 125 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {muacMm < 115 ? 'SAM Alert (<115mm)' : muacMm <= 125 ? 'MAM Risk (115-125)' : 'Normal Growth'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Symptoms & Clinical Presentation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="font-semibold text-white text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>03. Symptoms & Danger Signs</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedSymptoms.length} signs checked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SYMPTOM_OPTIONS.map((sym) => {
              const isChecked = selectedSymptoms.includes(sym.label);
              const isCritical = sym.category === 'critical';
              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => handleToggleSymptom(sym.label)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                    isChecked
                      ? isCritical
                        ? 'bg-rose-950/40 border-rose-600 text-rose-200'
                        : 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-medium">{sym.label}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                    isChecked
                      ? isCritical
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isChecked && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Clinical Assessment Notes</label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter patient history, physical examination findings, or referral recommendations..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Section 4: Geospatial Context & Outbreak Classification HUD */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>04. Automated Triage & PostGIS Outbreak Engine</span>
            </span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                triageUrgency === 'EMERGENCY_RED'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : triageUrgency === 'URGENT_YELLOW'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {triageUrgency}
              </span>
              {isOutbreakFlagged && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Cluster Case Trigger
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
            <div>
              <span className="text-[10px] text-slate-500 block">Latitude</span>
              <strong className="text-white">{latitude.toFixed(5)}° N</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Longitude</span>
              <strong className="text-white">{longitude.toFixed(5)}° E</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">GPS Accuracy</span>
              <strong className="text-emerald-400">±{gpsAccuracy}m</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Worker Callsign</span>
              <strong className="text-cyan-400">{chwWorkerId}</strong>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
            feedback.type === 'SUCCESS'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}>
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${
              feedback.type === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
            }`} />
            <div className="space-y-0.5">
              <div className="font-semibold">{feedback.message}</div>
              <div className="text-[11px] text-slate-300 font-mono">{feedback.subText}</div>
            </div>
          </div>
        )}

        {/* Commit Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="text-slate-400 text-[11px] font-mono">
            Transaction: Atomic Insert · SQLCipher Encrypted · Local Outbox Queued
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Save className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? 'Writing to SQLite...'
                  : intakeMode === 'EXISTING_PATIENT' && activePatientPriorAssessments.length > 0
                  ? `Save Follow-up Visit #${activePatientPriorAssessments.length + 1}`
                  : 'Save & Commit Patient Intake'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
