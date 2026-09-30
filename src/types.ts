export type UrgencyLevel = 'ROUTINE_GREEN' | 'URGENT_YELLOW' | 'EMERGENCY_RED';

export type SyncState = 'PENDING' | 'SYNCING' | 'ACKNOWLEDGED' | 'FAILED_RETRY';

export interface Patient {
  id: string; // UUID v4
  national_id_hash: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F' | 'OTHER';
  birth_year: number;
  village_name: string;
  cluster_zone_id: string;
  client_created_at: string;
  client_updated_at: string;
  server_synced_at: string | null;
  version: number;
}

export type DemographicAgeRange = '0-5' | '6-12' | '13-17' | '18-49' | '50-64' | '65+';
export type BiologicalSex = 'M' | 'F' | 'OTHER';

export interface TriageAssessment {
  id: string; // UUID v4
  patient_id: string; // Foreign Key
  chw_worker_id: string;
  age_range?: DemographicAgeRange;
  sex?: BiologicalSex;
  temperature_celsius: number;
  respiratory_rate_bpm: number;
  oxygen_saturation_pct: number;
  heart_rate_bpm: number;
  symptoms: string[];
  edge_ml_inferred_condition: string;
  edge_ml_confidence: number;
  edge_ml_model_version: string;
  triage_urgency: UrgencyLevel;
  clinical_notes: string;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  gps_accuracy_meters: number;
  captured_at: string;
  client_created_at: string;
  server_synced_at: string | null;
  is_outbreak_flagged: boolean;
}

export interface SyncQueueItem {
  queue_id: string;
  entity_type: 'PATIENT' | 'TRIAGE_ASSESSMENT' | 'CLINICAL_EVENT' | 'LOGISTICS_REQUEST';
  entity_id: string;
  mutation_type: 'CREATE' | 'UPDATE' | 'APPEND';
  payload_json: string;
  client_timestamp: string;
  retry_count: number;
  status: SyncState;
  idempotency_key: string;
  last_error: string | null;
}

export type LogisticsSupplyCategory =
  | 'VACCINE'
  | 'ANTIGEN_RDT'
  | 'MEDICATION'
  | 'RESPIRATORY_OXYGEN'
  | 'PPE_SANITATION'
  | 'FLUIDS_IV'
  | 'DIAGNOSTICS'
  | 'WATER_SANITATION';

export type LogisticsPriority = 'ROUTINE_RESUPPLY' | 'URGENT_OUTBREAK' | 'CRITICAL_LIFE_SAFETY';

export interface RequestedSupplyItem {
  itemName: string;
  category: LogisticsSupplyCategory;
  quantity: number;
  unit: string;
  requiresColdChain?: boolean;
  notes?: string;
}

export interface LogisticsBroadcastRequest {
  requestId: string;
  workerId: string;
  workerCallsign: string;
  targetCatchment: string;
  targetVillage: string;
  latitude: number;
  longitude: number;
  priority: LogisticsPriority;
  supplies: RequestedSupplyItem[];
  reason: string;
  relatedClusterId?: number | null;
  preferredFacilityId?: string | null;
  preferredFacilityName?: string | null;
  channel: 'RADIO_PACKET_APRS' | 'LOCAL_OUTBOX_CRDT' | 'SMS_BEACON';
  clientCreatedAt: string;
  serverSyncedAt?: string | null;
  outboxStatus: 'QUEUED_IN_OUTBOX' | 'IN_FLIGHT' | 'BROADCAST_CONFIRMED';
  syncQueueId?: string;
}

export interface ClinicalEvent {
  event_id: string;
  aggregate_id: string; // patient_id or assessment_id
  aggregate_type: 'PATIENT' | 'ASSESSMENT';
  event_type: 'PATIENT_ENROLLED' | 'ASSESSMENT_RECORDED' | 'MEDICATION_ADMINISTERED' | 'SYMPTOM_UPDATED';
  worker_id: string;
  worker_device_id: string;
  vector_clock: Record<string, number>;
  payload: Record<string, any>;
  client_timestamp: string;
  server_received_at?: string;
  is_conflict?: boolean;
  conflict_resolution?: string;
}

export interface OutbreakCluster {
  cluster_id: number;
  cluster_label: string;
  case_count: number;
  avg_temperature: number;
  respiratory_risk_ratio: number;
  centroid_lat: number;
  centroid_lng: number;
  radius_meters: number;
  polygon_points: [number, number][];
  severity: 'ELEVATED' | 'HIGH_ALERT' | 'CRITICAL_OUTBREAK';
  suspected_pathogen: string;
  demographic_breakdown?: {
    age_groups: Record<DemographicAgeRange, number>;
    sex_distribution: Record<BiologicalSex, number>;
    predominant_age_group: DemographicAgeRange;
    pediatric_vulnerability_pct: number;
    senior_vulnerability_pct: number;
    female_pct: number;
  };
}

export type NetworkCondition = 'ONLINE' | 'SPOTTY_2G' | 'OFFLINE' | 'PACKET_LOSS';

export type WriteFlowNodeId = 
  | 'USER_ACTION' 
  | 'REPOSITORY' 
  | 'ROOM_DB' 
  | 'WORK_MANAGER' 
  | 'SYNC_WORKER' 
  | 'API' 
  | 'UPDATE_SYNC_STATUS' 
  | 'CONFLICT_RESOLUTION';

export type WriteScenario = 'SUCCESS' | 'CONFLICT' | 'OFFLINE_QUEUED';

export interface WriteFlowStep {
  stepIndex: number;
  activeNode: WriteFlowNodeId;
  fromNode?: WriteFlowNodeId;
  toNode?: WriteFlowNodeId;
  edgeLabel?: string;
  badge: string;
  title: string;
  detail: string;
  roomDbStatus: 'IDLE' | 'SAVING_PENDING' | 'PENDING' | 'MARKING_SYNCED' | 'SYNCED' | 'APPLYING_STRATEGY' | 'RESOLVED';
  workManagerStatus?: 'IDLE' | 'ENQUEUING' | 'WAITING_ONLINE' | 'TRIGGERING_WORKER' | 'COMPLETED';
  workManagerState: 'IDLE' | 'ENQUEUING' | 'WAITING_ONLINE' | 'TRIGGERING_WORKER' | 'COMPLETED';
  apiStatus: 'IDLE' | 'TRANSMITTING' | '200_OK_SUCCESS' | '409_CONFLICT';
  uiState: 'INITIAL' | 'USER_EDITING' | 'OPTIMISTIC_SAVED' | 'SYNCED_REFRESH' | 'CONFLICT_MERGED_REFRESH';
  codeSnippet?: {
    file: string;
    code: string;
  };
}

export type AuditScope = 'ALL_CATCHMENT' | 'OUTBREAK_EPICENTER' | 'EMERGENCY_ONLY';

export interface ClinicAuditRecord {
  id: string; // UUID v4
  auditReportNumber: string; // e.g. "AUDIT-2026-09-TURK-401"
  clinicFacilityName: string;
  districtZone: string;
  auditorName: string;
  auditorRole: string;
  chwWorkerId: string;
  generatedAt: string;
  scope: AuditScope;
  clusterIdFilter: number | null;
  triageRecordCount: number;
  outbreakClusterCount: number;
  logisticsRequestsCount: number;
  sha256Digest: string; // Tamper-evident SHA-256 seal of the PDF
  encryptionAlgorithm: 'AES-GCM-256-PBKDF2';
  saltHex: string;
  ivHex: string;
  encryptedDataBase64: string; // Encrypted PDF binary payload
  fileSizeBytes: number;
  storageStatus: 'LOCAL_SQLCIPHER_STORED' | 'ARCHIVED';
  verificationStatus: 'VERIFIED_VALID' | 'SIGNATURE_MISMATCH' | 'UNVERIFIED';
  notes?: string;
}

export interface AggregatedAuditMetrics {
  totalAssessments: number;
  emergencyRedCount: number;
  urgentYellowCount: number;
  routineGreenCount: number;
  avgTemperature: number;
  maxTemperature: number;
  minOxygenSat: number;
  avgOxygenSat: number;
  avgRespiratoryRate: number;
  avgHeartRate: number;
  topSymptoms: { symptom: string; count: number; percentage: number }[];
  topConditions: { condition: string; count: number; percentage: number }[];
  outbreakClusters: OutbreakCluster[];
  pendingLogisticsCount: number;
  flaggedOutbreakCasesCount: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  patientsCount: number;
}

export type TelemedicineStreamStatus = 
  | 'IDLE' 
  | 'INITIALIZING_CAMERA' 
  | 'BUFFERING_OFFLINE' 
  | 'TRANSMITTING_LIVE' 
  | 'BURST_UPLINK' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'FAILED';

export type TelemedicineBandwidthPreset = 'ULTRA_LOW_2G' | 'FIELD_LOW_3G' | 'BALANCED_4G';

export interface TelemedicinePresetConfig {
  preset: TelemedicineBandwidthPreset;
  label: string;
  targetBitrateKbps: number;
  targetFps: number;
  resolution: string;
  codec: string;
  description: string;
}

export type SecondaryTriageDecision = 
  | 'CONFIRM_EMERGENCY_DISPATCH' 
  | 'AUTHORIZE_IV_MEDICATION' 
  | 'TITRATE_OXYGEN_THERAPY' 
  | 'SUPERVISED_CLINIC_OBSERVATION' 
  | 'DOWNGRADE_ROUTINE';

export interface SecondaryTriageDirective {
  directiveId: string;
  sessionId: string;
  physicianId: string;
  physicianName: string;
  physicianRole: string;
  hospitalFacility: string;
  decision: SecondaryTriageDecision;
  clinicalInstructions: string;
  authorizedMedications: string[];
  medevacDispatchApproved: boolean;
  issuedAt: string;
  acknowledgedByChw: boolean;
}

export interface TelemedicinePacket {
  packetId: string;
  sessionId: string;
  sequenceNumber: number;
  timestamp: string;
  frameDataUri?: string;
  vitalsSnapshot: {
    heartRate: number;
    oxygenSaturation: number;
    respiratoryRate: number;
    temperature: number;
    urgency: UrgencyLevel;
  };
  bandwidthKbps: number;
  synced: boolean;
}

export interface TelemedicineSession {
  sessionId: string;
  patientId: string;
  patientName: string;
  assessmentId?: string;
  workerId: string;
  workerCallsign: string;
  urgency: UrgencyLevel;
  clinicalNotes: string;
  symptoms: string[];
  startedAt: string;
  endedAt?: string;
  status: TelemedicineStreamStatus;
  bandwidthPreset: TelemedicineBandwidthPreset;
  targetHospital: string;
  bufferedPacketsCount: number;
  transmittedPacketsCount: number;
  totalBytesTransferred: number;
  priorityLevel: 'PRIORITY_CRITICAL_P0' | 'PRIORITY_HIGH_P1';
  directives: SecondaryTriageDirective[];
  latestFrameDataUri?: string;
  audioEnabled: boolean;
  cameraFacing: 'environment' | 'user';
  torchActive?: boolean;
}

