import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';

// Import the services we just built
import { ModelOTAService } from './src/services/ModelOTAService';
import { RespiratoryInferenceEngine } from './src/engine/RespiratoryInferenceEngine';
import { OpportunisticSyncManager } from './src/services/OpportunisticSyncManager';

export default function App() {
  const [bootState, setBootState] = useState('Initializing Systems...');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootFrontlinePipeline() {
      try {
        // 1. Request Microphone Permissions for Audio Diagnostics
        if (Platform.OS === 'android') {
          setBootState('Requesting Microphone Permissions...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'OpenTriage Health requires microphone access to record respiratory acoustics.',
              buttonPositive: 'Allow',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setBootState('Permission Denied. Audio diagnostics disabled.');
            return;
          }
        }

        // 2. Download and Hot-Swap Edge-ML Models (if new ones exist)
        setBootState('Checking for OTA Model Updates...');
        const otaService = new ModelOTAService();
        await otaService.downloadModelsIfMissing();

        // 3. Initialize the Dual-ONNX Pipeline
        setBootState('Booting Edge-ML Inference Engine...');
        const mlEngine = new RespiratoryInferenceEngine();
        await mlEngine.initializeModels();

        // 4. Start the Offline Sync Daemon
        setBootState('Starting Offline Sync Daemon...');
        const syncManager = new OpportunisticSyncManager();
        await syncManager.attemptSync(); // Immediately try to flush any old pending reports

        setBootState('OpenTriage Health Ready');
        setIsReady(true);
      } catch (error) {
        console.error('Boot sequence failed:', error);
        setBootState('System Failure. Check logs.');
      }
    }

    bootFrontlinePipeline();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboard}>
        <Text style={styles.title}>OpenTriage Health</Text>
        <Text style={styles.subtitle}>Frontline Edge-ML Diagnostics</Text>
        
        <View style={styles.statusBox}>
          {!isReady && <ActivityIndicator size="small" color="#00ff00" />}
          <Text style={styles.statusText}>{bootState}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center' },
  dashboard: { alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#888888', marginBottom: 40 },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', padding: 15, borderRadius: 8 },
  statusText: { color: '#00ff00', marginLeft: 10, fontSize: 14 }
});