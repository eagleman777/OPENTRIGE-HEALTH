import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InferenceSession } from 'onnxruntime-react-native';

export default function App() {
  const [status, setStatus] = useState('Initializing ONNX...');

  useEffect(() => {
    async function setupONNX() {
      try {
        // This is where we will load the model later:
        // const session = await InferenceSession.create(require('./assets/models/triage_model.onnx'));
        setStatus('ONNX Runtime Engine Ready (Offline)');
      } catch (e) {
        setStatus('ONNX Error: ' + e.message);
      }
    }
    setupONNX();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenTriage Mobile</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  status: { fontSize: 16, color: 'green' }
});