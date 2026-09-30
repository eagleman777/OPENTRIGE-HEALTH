import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';

// Point this to where you saved the model in the assets folder
const modelAsset = require('./assets/models/triage_model.onnx');

export default function MobileFieldSimulator() {
  // Hold the loaded AI model in state
  const [aiSession, setAiSession] = useState(null);

  useEffect(() => {
    async function loadModel() {
      try {
        const session = await InferenceSession.create(modelAsset);

        // Add these two lines to print the exact names in your Metro terminal:
        console.log("My Model's Input Names: ", session.inputNames);
        console.log("My Model's Output Names: ", session.outputNames);

        setAiSession(session);
        console.log("Offline AI Model loaded successfully!");
      } catch (e) {
        console.error("Failed to load model", e);
      }
    }
    loadModel();
  }, []);

  async function runTriagePrediction() {
    if (!aiSession) {
      console.log("Model is still loading, please wait...");
      return;
    }

    // Example patient symptoms (e.g., Fever, HeartRate, Oxygen, Pain)
    const patientData = [38.5, 110.0, 92.0, 6.0]; 
    const inputTensor = new Tensor('float32', new Float32Array(patientData), [1, 4]);

    try {
      // Dynamic injection of the exact input and output names from the loaded session
      const inputName = aiSession.inputNames?.[0] || 'input_name';
      const outputName = aiSession.outputNames?.[0] || 'output_name';

      // Use the exact input name your model expects
      const feeds = { [inputName]: inputTensor };
      const results = await aiSession.run(feeds);

      // Extract the data using the exact output name
      console.log("Prediction Result:", results[outputName]?.data);
    } catch (error) {
      console.error("Inference failed", error);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Run AI Diagnostics" onPress={runTriagePrediction} />
    </View>
  );
}
