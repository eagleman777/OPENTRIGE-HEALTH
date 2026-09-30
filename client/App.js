import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import nacl from 'tweetnacl';

// Helper functions to handle bytes and hex (since React Native lacks native Buffer)
const encodeAscii = (str) => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
};
const toHex = (arr) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

export default function App() {
  const [status, setStatus] = useState('Ready');

  const sendSecurePayload = async () => {
    try {
      setStatus('Generating Ed25519 signature...');
      
      // 1. Generate keys (just like Python's nacl.signing.SigningKey.generate())
      const keypair = nacl.sign.keyPair();
      
      // 2. Create the exact spatial payload Mothercode expects
      const payload = {
        patient_hash: "mobile_" + Math.floor(Math.random() * 10000),
        lon: 7.91,
        lat: 5.03,
        diagnosis: "suspected_tb",
        severity: "critical"
      };

      // 3. Convert JSON to bytes (no spaces, matches Python's separators=(',', ':'))
      const messageStr = JSON.stringify(payload);
      const messageBytes = encodeAscii(messageStr);
      
      // 4. Sign the payload offline
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      
      // 5. Package for the zero-trust backend
      const securePackage = {
        payload: payload,
        signature: toHex(signatureBytes),
        public_key: toHex(keypair.publicKey)
      };

      setStatus('Sending to local FastAPI server...');

      // IMPORTANT: Replace with your actual computer IP address!
      const response = await fetch('http:// 172.18.208.1:8000/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securePackage)
      });

      const result = await response.json();
      
      if (response.ok) {
        setStatus('Success! Server says: ' + result.message);
      } else {
        setStatus('Server Rejected: ' + JSON.stringify(result));
      }
      
    } catch (error) {
      setStatus('Network Error (Is the server running?): ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenTriage Mobile</Text>
      <Text style={styles.status}>{status}</Text>
      <View style={{ marginTop: 30 }}>
        <Button title="Test Cryptographic Sync" onPress={sendSecurePayload} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  status: { fontSize: 16, color: 'blue', textAlign: 'center', marginHorizontal: 20 }
});