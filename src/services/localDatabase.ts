/**
 * Simulated Local SQLite / SQLCipher Encrypted Store
 * Strictly mirrors the tables, triggers, and state machine of 01_local_sqlite_schema.sql
 */

import { Patient, TriageAssessment, SyncQueueItem, ClinicalEvent, UrgencyLevel, LogisticsBroadcastRequest, RequestedSupplyItem, LogisticsPriority, ClinicAuditRecord } from '../types';
import { BiometricAuthService } from './BiometricAuthService';

const STORAGE_KEY_PATIENTS = 'frontline_sqlite_patients';
const STORAGE_KEY_TRIAGE = 'frontline_sqlite_triage';
const STORAGE_KEY_SYNC_QUEUE = 'frontline_sqlite_sync_queue';
const STORAGE_KEY_EVENTS = 'frontline_sqlite_events';
const STORAGE_KEY_LOGISTICS_REQUESTS = 'frontline_sqlite_logistics_requests';
const STORAGE_KEY_AUDIT_REPORTS = 'frontline_sqlite_audit_reports';

// Initial pre-seeded historical audit report representing prior audit paper-trail
const INITIAL_AUDIT_RECORDS: ClinicAuditRecord[] = [
  {
    id: 'audit-record-2026-001',
    auditReportNumber: 'AUDIT-2026-09-TURK-398',
    clinicFacilityName: 'Lokichoggio Sub-County Outpost Clinic',
    districtZone: 'North Turkana Catchment Zone 4',
    auditorName: 'Dr. Kenneth Odhiambo',
    auditorRole: 'District Surveillance Officer',
    chwWorkerId: 'CHW-KEN-084',
    generatedAt: '2026-09-14T09:30:00Z',
    scope: 'ALL_CATCHMENT',
    clusterIdFilter: null,
    triageRecordCount: 3,
    outbreakClusterCount: 1,
    logisticsRequestsCount: 1,
    sha256Digest: '7a9c2ef184b238ef09210c4109fa7bc81023d8495a0219ccfae9812401f92e01',
    encryptionAlgorithm: 'AES-GCM-256-PBKDF2',
    saltHex: 'a4b8910f2c8d7e6a1234567890abcdef',
    ivHex: 'c0d1e2f3a4b5c6d7e8f90123',
    encryptedDataBase64: 'OFFLINE_AES_GCM_256_SEALED_PAYLOAD_SAMPLE_TURKANA_ZONE_4',
    fileSizeBytes: 24890,
    storageStatus: 'LOCAL_SQLCIPHER_STORED',
    verificationStatus: 'VERIFIED_VALID',
    notes: 'Baseline pediatric respiratory surge audit for week 37. High alert initiated in Lokichoggio settlement.',
  }
];

// Initial seeded logistics requests demonstrating local outbox queuing
const INITIAL_LOGISTICS_REQUESTS: LogisticsBroadcastRequest[] = [
  {
    requestId: 'REQ-2026-1042',
    workerId: 'CHW-KEN-084',
    workerCallsign: 'Alpha-Turkana-4',
    targetCatchment: 'Lokichoggio Outpost',
    targetVillage: 'Lokichoggio Settlement (Zone 4)',
    latitude: 4.2180,
    longitude: 34.3620,
    priority: 'URGENT_OUTBREAK',
    supplies: [
      {
        itemName: 'Oral Rehydration Salts (WHO formula)',
        category: 'MEDICATION',
        quantity: 100,
        unit: 'sachets',
        requiresColdChain: false,
        notes: 'Outbreak acute diarrhea surge',
      },
      {
        itemName: 'SARI Dual Influenza/COVID Rapid Antigen Tests',
        category: 'ANTIGEN_RDT',
        quantity: 50,
        unit: 'kits',
        requiresColdChain: false,
        notes: 'Pediatric fever screening',
      },
    ],
    reason: 'Cluster #1 surge in pediatric respiratory illness; local clinic cabinet at zero buffer stock.',
    relatedClusterId: 1,
    preferredFacilityId: 'res-depot-01',
    preferredFacilityName: 'Turkana North District Medical Depot',
    channel: 'LOCAL_OUTBOX_CRDT',
    clientCreatedAt: '2026-09-18T05:30:00Z',
    serverSyncedAt: null,
    outboxStatus: 'QUEUED_IN_OUTBOX',
    syncQueueId: 'q-logistics-initial-01',
  },
  {
    requestId: 'REQ-2026-0985',
    workerId: 'CHW-KEN-091',
    workerCallsign: 'Echo-Songot-1',
    targetCatchment: 'Songot Ridge',
    targetVillage: 'Songot Ridge Mobile Clinic',
    latitude: 4.1950,
    longitude: 34.3310,
    priority: 'ROUTINE_RESUPPLY',
    supplies: [
      {
        itemName: 'Amoxicillin Oral Suspension 250mg/5ml',
        category: 'MEDICATION',
        quantity: 30,
        unit: 'bottles',
        requiresColdChain: false,
        notes: 'Pediatric pneumonia protocol',
      },
    ],
    reason: 'Weekly replenishment for mobile clinic outpost.',
    relatedClusterId: 2,
    preferredFacilityId: 'res-cold-01',
    preferredFacilityName: 'Lokichoggio Sub-County Cold-Chain Facility',
    channel: 'LOCAL_OUTBOX_CRDT',
    clientCreatedAt: '2026-09-17T11:40:00Z',
    serverSyncedAt: '2026-09-17T11:45:00Z',
    outboxStatus: 'BROADCAST_CONFIRMED',
    syncQueueId: 'q-logistics-initial-02',
  },
];

const INITIAL_SYNC_QUEUE: SyncQueueItem[] = [
  {
    queue_id: 'q-triage-failed-01',
    entity_type: 'TRIAGE_ASSESSMENT',
    entity_id: 't-a101-4455-8899-001',
    mutation_type: 'CREATE',
    payload_json: JSON.stringify({
      assessment_id: 't-a101-4455-8899-001',
      patient_id: 'p-01a4e8d2-43b9-4f70-b118-2e633d7b801a',
      triage_urgency: 'EMERGENCY_RED',
      temperature_celsius: 39.4,
      condition: 'SEVERE_LOWER_RESPIRATORY_INFECTION (PNEUMONIA)',
    }),
    client_timestamp: '2026-09-18T05:20:00Z',
    retry_count: 2,
    status: 'FAILED_RETRY',
    idempotency_key: 'idemp-triage-retry-001',
    last_error: 'HTTP 504 Gateway Timeout: Uplink dropped during encrypted handshake with base station.',
  },
  {
    queue_id: 'q-logistics-initial-01',
    entity_type: 'LOGISTICS_REQUEST',
    entity_id: 'REQ-2026-1042',
    mutation_type: 'CREATE',
    payload_json: JSON.stringify(INITIAL_LOGISTICS_REQUESTS[0]),
    client_timestamp: '2026-09-18T05:30:00Z',
    retry_count: 0,
    status: 'PENDING',
    idempotency_key: 'idemp-logistics-1042',
    last_error: null,
  },
];

// Seed patients located in a real-world frontline surveillance zone (e.g., East African Rift Valley catchment)
const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p-01a4e8d2-43b9-4f70-b118-2e633d7b801a',
    national_id_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    first_name: 'Amina',
    last_name: 'Kariuki',
    gender: 'F',
    birth_year: 2019,
    village_name: 'Lokichoggio Outpost',
    cluster_zone_id: 'ZONE-NORTH-TURKANA-4',
    client_created_at: '2026-09-12T08:15:00Z',
    client_updated_at: '2026-09-12T08:15:00Z',
    server_synced_at: '2026-09-12T09:00:00Z',
    version: 1,
  },
  {
    id: 'p-88b9c1d0-12f4-4ea8-971a-e95b058a994c',
    national_id_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    first_name: 'Emmanuel',
    last_name: 'Lokuruka',
    gender: 'M',
    birth_year: 2021,
    village_name: 'Nanam Settlement',
    cluster_zone_id: 'ZONE-NORTH-TURKANA-4',
    client_created_at: '2026-09-13T10:30:00Z',
    client_updated_at: '2026-09-13T10:30:00Z',
    server_synced_at: '2026-09-13T11:20:00Z',
    version: 1,
  },
  {
    id: 'p-72cc3e81-55da-49e0-82a1-fa0819bd9102',
    national_id_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    first_name: 'Zainab',
    last_name: 'Abdi',
    gender: 'F',
    birth_year: 2017,
    village_name: 'Songot Ridge',
    cluster_zone_id: 'ZONE-NORTH-TURKANA-4',
    client_created_at: '2026-09-14T07:45:00Z',
    client_updated_at: '2026-09-14T07:45:00Z',
    server_synced_at: '2026-09-14T08:10:00Z',
    version: 1,
  },
  {
    id: 'p-102a9b34-88aa-4621-93cc-cc381048f102',
    national_id_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    first_name: 'Kiprono',
    last_name: 'Erot',
    gender: 'M',
    birth_year: 2023,
    village_name: 'Lokichoggio Outpost',
    cluster_zone_id: 'ZONE-NORTH-TURKANA-4',
    client_created_at: '2026-09-16T14:00:00Z',
    client_updated_at: '2026-09-16T14:00:00Z',
    server_synced_at: null, // Pending local creation
    version: 1,
  }
];

// Initial triage records (some synced, forming historical outbreak baseline in Lokichoggio)
const INITIAL_TRIAGE: TriageAssessment[] = [
  {
    id: 't-a101-4455-8899-001',
    patient_id: 'p-01a4e8d2-43b9-4f70-b118-2e633d7b801a',
    chw_worker_id: 'CHW-KEN-084',
    age_range: '6-12',
    sex: 'F',
    temperature_celsius: 39.4,
    respiratory_rate_bpm: 48,
    oxygen_saturation_pct: 89.0,
    heart_rate_bpm: 142,
    symptoms: ['High Fever (>39C)', 'Persistent Cough', 'Chest Indrawing', 'Dyspnea'],
    edge_ml_inferred_condition: 'SEVERE_LOWER_RESPIRATORY_INFECTION (PNEUMONIA)',
    edge_ml_confidence: 0.942,
    edge_ml_model_version: 'onnx-resp-int8-v2.4.1-9a4f',
    triage_urgency: 'EMERGENCY_RED',
    clinical_notes: 'Severe respiratory distress, subcostal retractions. Oxygen administered, referral initiated.',
    latitude: 4.2045,
    longitude: 34.3482,
    altitude_meters: 630,
    gps_accuracy_meters: 4.5,
    captured_at: '2026-09-12T08:22:00Z',
    client_created_at: '2026-09-12T08:23:00Z',
    server_synced_at: '2026-09-12T09:00:00Z',
    is_outbreak_flagged: true,
  },
  {
    id: 't-b202-4455-8899-002',
    patient_id: 'p-88b9c1d0-12f4-4ea8-971a-e95b058a994c',
    chw_worker_id: 'CHW-KEN-084',
    age_range: '0-5',
    sex: 'M',
    temperature_celsius: 39.1,
    respiratory_rate_bpm: 42,
    oxygen_saturation_pct: 91.0,
    heart_rate_bpm: 135,
    symptoms: ['High Fever (>39C)', 'Stridor / Wheezing', 'Shortness of Breath'],
    edge_ml_inferred_condition: 'ACUTE_BRONCHIOLITIS_WITH_WHEEZE',
    edge_ml_confidence: 0.890,
    edge_ml_model_version: 'onnx-resp-int8-v2.4.1-9a4f',
    triage_urgency: 'URGENT_YELLOW',
    clinical_notes: 'Moderate stridor, nebulized bronchodilator protocol started.',
    latitude: 4.2180,
    longitude: 34.3620,
    altitude_meters: 642,
    gps_accuracy_meters: 5.1,
    captured_at: '2026-09-13T10:35:00Z',
    client_created_at: '2026-09-13T10:36:00Z',
    server_synced_at: '2026-09-13T11:20:00Z',
    is_outbreak_flagged: true,
  },
  {
    id: 't-c303-4455-8899-003',
    patient_id: 'p-72cc3e81-55da-49e0-82a1-fa0819bd9102',
    chw_worker_id: 'CHW-KEN-091',
    age_range: '6-12',
    sex: 'F',
    temperature_celsius: 38.8,
    respiratory_rate_bpm: 38,
    oxygen_saturation_pct: 93.0,
    heart_rate_bpm: 120,
    symptoms: ['Persistent Cough', 'High Fever (>39C)', 'Lethargy'],
    edge_ml_inferred_condition: 'SUSPECTED_VIRAL_RESPIRATORY_SYNDROME',
    edge_ml_confidence: 0.875,
    edge_ml_model_version: 'onnx-resp-int8-v2.4.1-9a4f',
    triage_urgency: 'URGENT_YELLOW',
    clinical_notes: 'Fever day 4. Oral rehydration given. Village cluster suspected.',
    latitude: 4.1950,
    longitude: 34.3310,
    altitude_meters: 620,
    gps_accuracy_meters: 3.8,
    captured_at: '2026-09-14T07:50:00Z',
    client_created_at: '2026-09-14T07:51:00Z',
    server_synced_at: '2026-09-14T08:10:00Z',
    is_outbreak_flagged: true,
  }
];

export class LocalDatabaseService {
  public static isDatabaseLocked(): boolean {
    return BiometricAuthService.isLocked();
  }

  public static getPatients(): Patient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    this.savePatients(INITIAL_PATIENTS);
    return INITIAL_PATIENTS;
  }

  private static notifyMutation(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sqlite_mutation'));
    }
  }

  public static savePatients(patients: Patient[]): void {
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    this.notifyMutation();
  }

  public static getTriageAssessments(): TriageAssessment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TRIAGE);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    this.saveTriageAssessments(INITIAL_TRIAGE);
    return INITIAL_TRIAGE;
  }

  public static saveTriageAssessments(assessments: TriageAssessment[]): void {
    localStorage.setItem(STORAGE_KEY_TRIAGE, JSON.stringify(assessments));
    this.notifyMutation();
  }

  public static getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    this.saveSyncQueue(INITIAL_SYNC_QUEUE);
    return INITIAL_SYNC_QUEUE;
  }

  public static saveSyncQueue(items: SyncQueueItem[]): void {
    localStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(items));
    this.notifyMutation();
  }

  public static getLogisticsRequests(): LogisticsBroadcastRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGISTICS_REQUESTS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    this.saveLogisticsRequests(INITIAL_LOGISTICS_REQUESTS);
    return INITIAL_LOGISTICS_REQUESTS;
  }

  public static saveLogisticsRequests(requests: LogisticsBroadcastRequest[]): void {
    localStorage.setItem(STORAGE_KEY_LOGISTICS_REQUESTS, JSON.stringify(requests));
    this.notifyMutation();
  }

  /**
   * Broadcast a logistics request: Queues locally in SQLCipher sync_queue outbox
   */
  public static queueLogisticsRequest(params: {
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
    channel?: 'RADIO_PACKET_APRS' | 'LOCAL_OUTBOX_CRDT' | 'SMS_BEACON';
  }): LogisticsBroadcastRequest {
    const requestId = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const queueId = `q-logistics-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const request: LogisticsBroadcastRequest = {
      requestId,
      workerId: params.workerId,
      workerCallsign: params.workerCallsign,
      targetCatchment: params.targetCatchment,
      targetVillage: params.targetVillage,
      latitude: params.latitude,
      longitude: params.longitude,
      priority: params.priority,
      supplies: params.supplies,
      reason: params.reason,
      relatedClusterId: params.relatedClusterId ?? null,
      preferredFacilityId: params.preferredFacilityId ?? null,
      preferredFacilityName: params.preferredFacilityName ?? null,
      channel: params.channel || 'LOCAL_OUTBOX_CRDT',
      clientCreatedAt: nowIso,
      serverSyncedAt: null,
      outboxStatus: 'QUEUED_IN_OUTBOX',
      syncQueueId: queueId,
    };

    // 1. Save to local logistics requests store
    const requests = this.getLogisticsRequests();
    requests.unshift(request);
    this.saveLogisticsRequests(requests);

    // 2. Queue in SQLCipher outbox sync_queue
    const syncQueue = this.getSyncQueue();
    const queueItem: SyncQueueItem = {
      queue_id: queueId,
      entity_type: 'LOGISTICS_REQUEST',
      entity_id: requestId,
      mutation_type: 'CREATE',
      payload_json: JSON.stringify(request),
      client_timestamp: nowIso,
      retry_count: 0,
      status: 'PENDING',
      idempotency_key: crypto.randomUUID(),
      last_error: null,
    };
    syncQueue.push(queueItem);
    this.saveSyncQueue(syncQueue);

    // 3. Append to clinical event log for tamper-evident auditability
    const events = this.getClinicalEvents();
    events.unshift({
      event_id: 'evt-' + crypto.randomUUID(),
      aggregate_id: requestId,
      aggregate_type: 'ASSESSMENT',
      event_type: 'ASSESSMENT_RECORDED',
      worker_id: params.workerId,
      worker_device_id: 'SM-G532F-ARMv7',
      vector_clock: { [params.workerId]: 1 },
      payload: {
        action: 'LOGISTICS_BROADCAST_QUEUED',
        requestId,
        priority: params.priority,
        item_count: params.supplies.length,
        items: params.supplies.map((s) => `${s.quantity}x ${s.itemName}`),
        outbox_status: 'QUEUED_IN_OUTBOX',
      },
      client_timestamp: nowIso,
    });
    this.saveClinicalEvents(events);

    return request;
  }

  public static cancelLogisticsRequest(requestId: string): void {
    const requests = this.getLogisticsRequests();
    const target = requests.find((r) => r.requestId === requestId);
    if (!target) return;

    if (target.outboxStatus === 'QUEUED_IN_OUTBOX') {
      const syncQueue = this.getSyncQueue().filter((q) => q.entity_id !== requestId);
      this.saveSyncQueue(syncQueue);

      const filteredRequests = requests.filter((r) => r.requestId !== requestId);
      this.saveLogisticsRequests(filteredRequests);
    }
  }

  public static getClinicalEvents(): ClinicalEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return [];
  }

  public static saveClinicalEvents(events: ClinicalEvent[]): void {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    this.notifyMutation();
  }

  /**
   * Atomic Transaction: Insert assessment, append event, and enqueue for sync
   */
  public static insertTriageAssessment(assessment: TriageAssessment): void {
    const assessments = this.getTriageAssessments();
    assessments.unshift(assessment);
    this.saveTriageAssessments(assessments);

    // Queue for sync
    const syncQueue = this.getSyncQueue();
    const queueItem: SyncQueueItem = {
      queue_id: 'q-' + crypto.randomUUID(),
      entity_type: 'TRIAGE_ASSESSMENT',
      entity_id: assessment.id,
      mutation_type: 'CREATE',
      payload_json: JSON.stringify(assessment),
      client_timestamp: assessment.client_created_at,
      retry_count: 0,
      status: 'PENDING',
      idempotency_key: crypto.randomUUID(),
      last_error: null,
    };
    syncQueue.push(queueItem);
    this.saveSyncQueue(syncQueue);

    // Also append to immutable clinical event log
    const events = this.getClinicalEvents();
    events.unshift({
      event_id: 'evt-' + crypto.randomUUID(),
      aggregate_id: assessment.patient_id,
      aggregate_type: 'ASSESSMENT',
      event_type: 'ASSESSMENT_RECORDED',
      worker_id: assessment.chw_worker_id,
      worker_device_id: 'SM-G532F-ARMv7',
      vector_clock: { [assessment.chw_worker_id]: 1 },
      payload: {
        assessment_id: assessment.id,
        urgency: assessment.triage_urgency,
        temp: assessment.temperature_celsius,
        rr: assessment.respiratory_rate_bpm,
        spo2: assessment.oxygen_saturation_pct,
        edge_condition: assessment.edge_ml_inferred_condition,
        age_range: assessment.age_range,
        sex: assessment.sex,
      },
      client_timestamp: assessment.client_created_at,
    });
    this.saveClinicalEvents(events);
  }

  /**
   * Insert new patient locally
   */
  public static insertPatient(patient: Patient): void {
    const patients = this.getPatients();
    patients.unshift(patient);
    this.savePatients(patients);

    // Queue for sync
    const syncQueue = this.getSyncQueue();
    syncQueue.push({
      queue_id: 'q-' + crypto.randomUUID(),
      entity_type: 'PATIENT',
      entity_id: patient.id,
      mutation_type: 'CREATE',
      payload_json: JSON.stringify(patient),
      client_timestamp: patient.client_created_at,
      retry_count: 0,
      status: 'PENDING',
      idempotency_key: crypto.randomUUID(),
      last_error: null,
    });
    this.saveSyncQueue(syncQueue);
  }

  /**
   * Audit Reports Table (frontline_sqlite_audit_reports)
   * Local AES-GCM-256 encrypted summaries providing paper-trail for rural clinic audits
   */
  public static getAuditRecords(): ClinicAuditRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUDIT_REPORTS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    this.saveAuditRecords(INITIAL_AUDIT_RECORDS);
    return INITIAL_AUDIT_RECORDS;
  }

  public static saveAuditRecords(records: ClinicAuditRecord[]): void {
    localStorage.setItem(STORAGE_KEY_AUDIT_REPORTS, JSON.stringify(records));
    this.notifyMutation();
  }

  public static storeEncryptedAuditReport(record: ClinicAuditRecord): void {
    const records = this.getAuditRecords();
    records.unshift(record);
    this.saveAuditRecords(records);

    // Also log an immutable clinical event for the audit paper-trail
    const events = this.getClinicalEvents();
    events.unshift({
      event_id: 'evt-audit-' + crypto.randomUUID(),
      aggregate_id: record.id,
      aggregate_type: 'ASSESSMENT',
      event_type: 'ASSESSMENT_RECORDED',
      worker_id: record.chwWorkerId,
      worker_device_id: 'SM-G532F-ARMv7',
      vector_clock: { [record.chwWorkerId]: 1 },
      payload: {
        action: 'CLINIC_AUDIT_SEALED',
        auditReportNumber: record.auditReportNumber,
        facility: record.clinicFacilityName,
        sha256Digest: record.sha256Digest,
        encryptionAlgorithm: record.encryptionAlgorithm,
        triageRecordCount: record.triageRecordCount,
        outbreakClusterCount: record.outbreakClusterCount,
        fileSizeBytes: record.fileSizeBytes,
      },
      client_timestamp: record.generatedAt,
    });
    this.saveClinicalEvents(events);
  }

  public static deleteAuditRecord(id: string): void {
    const records = this.getAuditRecords().filter((r) => r.id !== id);
    this.saveAuditRecords(records);
  }

  /**
   * Reset local database to factory seed
   */
  public static resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEY_PATIENTS);
    localStorage.removeItem(STORAGE_KEY_TRIAGE);
    localStorage.removeItem(STORAGE_KEY_SYNC_QUEUE);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_LOGISTICS_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_AUDIT_REPORTS);
    this.savePatients(INITIAL_PATIENTS);
    this.saveTriageAssessments(INITIAL_TRIAGE);
    this.saveLogisticsRequests(INITIAL_LOGISTICS_REQUESTS);
    this.saveSyncQueue(INITIAL_SYNC_QUEUE);
    this.saveClinicalEvents([]);
    this.saveAuditRecords(INITIAL_AUDIT_RECORDS);
  }
}
