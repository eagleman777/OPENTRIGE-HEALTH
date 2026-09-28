# 🩺 OpenTriage Health: Offline-First Edge-ML Diagnostics

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?logo=react)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)]()
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial_Clustering-336791?logo=postgresql)]()

**OpenTriage Health** is an open-source, offline-first frontline diagnostic mobile application engineered for zero-connectivity environments. Built for healthcare workers, it combines edge-AI respiratory acoustic diagnostics with zero-trust cryptographic syncing and the **Mothercode** geospatial backend to monitor and map disease outbreaks in real-time.

---

## 🏗️ Architecture Deep Dive

### 1. Dual-ONNX Edge-ML Pipeline
Patient privacy and offline resilience are paramount. Respiratory diagnostics are processed entirely on the edge.
* **Feature Extraction Engine:** A Mel-Spectrogram ONNX model processes raw microphone buffers into normalized feature tensors.
* **Quantized Inference Classifier:** An INT8-quantized classifier evaluates the spectrogram to detect physiological anomalies (e.g., crackles, wheezes).

### 2. Zero-Trust Offline-First Syncing 
The application functions 100% autonomously in the field.
* **Ed25519 Cryptographic Identity:** Frontline workers sign their diagnostic payloads offline.
* **Opportunistic Sync Daemon:** A background network monitor watches the device's connection state and cryptographically flushes queued SQLite records to the server.

### 3. Mothercode Spatial Clustering Backend
The server infrastructure is powered by the **Mothercode** spatial intelligence engine.
* **FastAPI & AsyncPG Ingestion:** A high-throughput, asynchronous API that natively verifies Ed25519 signatures.
* **PostGIS Outbreak Mapping:** Geospatial intelligence leverages `ST_ClusterDBSCAN` to automatically identify and group critical outbreak clusters.

---

## 🤝 Contributing
OpenTriage Health is a community-driven project bridging the gap between developers, data scientists, and public health experts. Please review our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

## 📄 License
This project is licensed under the [MIT License](LICENSE).