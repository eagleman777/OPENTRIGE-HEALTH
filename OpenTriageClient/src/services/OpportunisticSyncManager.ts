import { open } from '@op-engineering/op-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { OfflineAuthenticator } from './OfflineAuthenticator';

// Initialize the ultra-fast C++ SQLite database
const db = open({ name: 'triage_offline.sqlite' });

export class OpportunisticSyncManager {
  private authenticator = new OfflineAuthenticator();

  constructor() {
    db.execute('CREATE TABLE IF NOT EXISTS pending_reports (id TEXT PRIMARY KEY, payload TEXT)');
  }

  async saveLocally(id: string, payload: object) {
    db.execute('INSERT INTO pending_reports (id, payload) VALUES (?, ?)', [id, JSON.stringify(payload)]);
    this.attemptSync(); // Try to sync immediately if connected
  }

  async attemptSync() {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return; // Abort if completely offline

    const results = db.execute('SELECT * FROM pending_reports');
    if (!results.rows || results.rows.length === 0) return;

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      const payload = JSON.parse(row.payload);
      
      // Cryptographically sign the payload before transmitting
      const signedData = await this.authenticator.signPayload(payload);
      
      try {
        // Points to the FastAPI endpoint you set up in main.py
        const response = await fetch('http://localhost:8000/api/v1/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signedData)
        });
        
        if (response.ok) {
          // Remove from local SQLite once successfully synced to the cluster
          db.execute('DELETE FROM pending_reports WHERE id = ?', [row.id]);
        }
      } catch (error) {
        console.log(`Sync failed for ${row.id}, will stay in local queue.`);
      }
    }
  }

  /**
   * Specifically triggers resending of failed sync items
   */
  async retryFailedSyncs() {
    console.log("OpportunisticSyncManager: Triggered retry of FAILED_RETRY queue items.");
    return this.attemptSync();
  }
}