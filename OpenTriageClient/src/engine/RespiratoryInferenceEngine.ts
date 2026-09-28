import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as RNFS from 'react-native-fs';

export class RespiratoryInferenceEngine {
  private featureSession: InferenceSession | null = null;
  private classifierSession: InferenceSession | null = null;

  /**
   * Initializes both the Mel-Spectrogram feature extractor and 
   * the INT8 Quantized Respiratory Classifier ONNX models.
   */
  async initializeModels() {
    const featureModelPath = `${RNFS.DocumentDirectoryPath}/melspectrogram.onnx`;
    const classifierModelPath = `${RNFS.DocumentDirectoryPath}/respiratory_classifier_int8.onnx`;

    try {
      this.featureSession = await InferenceSession.create(featureModelPath);
      this.classifierSession = await InferenceSession.create(classifierModelPath);
      console.log('Dual-ONNX Pipeline Initialized Successfully');
    } catch (error) {
      console.error('Failed to load ONNX models. Check ModelOTAService status.', error);
    }
  }

  /**
   * Runs offline inference on raw audio buffers
   */
  async analyzeAudio(rawAudioData: Float32Array): Promise<string> {
    if (!this.featureSession || !this.classifierSession) {
      throw new Error('Models not initialized. Call initializeModels() first.');
    }

    // 1. Convert raw audio to Mel-Spectrogram features
    const audioTensor = new Tensor('float32', rawAudioData, [1, rawAudioData.length]);
    const featureFeeds = { input_audio: audioTensor };
    const featureResults = await this.featureSession.run(featureFeeds);
    const spectrogram = featureResults.output_spectrogram;

    // 2. Classify the respiratory pattern (e.g., crackles, wheezes, normal)
    const classifierFeeds = { input_features: spectrogram };
    const classification = await this.classifierSession.run(classifierFeeds);
    
    const outputData = classification.probabilities.data as Float32Array;
    return this.decodeClassification(outputData);
  }

  private decodeClassification(probabilities: Float32Array): string {
    const classes = ['Normal', 'Wheeze', 'Crackle', 'COVID-19_Suspect'];
    const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    return classes[maxIndex];
  }
}