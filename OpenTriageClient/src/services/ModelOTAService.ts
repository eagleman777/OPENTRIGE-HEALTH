import * as RNFS from 'react-native-fs';

export class ModelOTAService {
  // Remote URLs where your updated ONNX binaries will be hosted
  private static readonly MODEL_URLS = {
    feature: 'https://models.opentriage.org/v1/melspectrogram.onnx',
    classifier: 'https://models.opentriage.org/v1/respiratory_classifier_int8.onnx'
  };

  async downloadModelsIfMissing() {
    await this.downloadModel(this.MODEL_URLS.feature, 'melspectrogram.onnx');
    await this.downloadModel(this.MODEL_URLS.classifier, 'respiratory_classifier_int8.onnx');
  }

  private async downloadModel(url: string, filename: string) {
    const destPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
    const exists = await RNFS.exists(destPath);
    
    if (!exists) {
      console.log(`Downloading Edge-ML model: ${filename}...`);
      try {
        await RNFS.downloadFile({
          fromUrl: url,
          toFile: destPath,
        }).promise;
        console.log(`${filename} successfully downloaded and installed to device storage.`);
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error);
      }
    } else {
      console.log(`${filename} is already installed.`);
    }
  }
}