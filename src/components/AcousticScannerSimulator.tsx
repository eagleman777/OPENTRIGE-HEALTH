import React, { useState } from 'react';
import { Mic, Activity, CheckCircle, Volume2, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { EdgeMLInferenceResult } from '../services/edgeML';

export interface AcousticScannerSimulatorProps {
  onApplyDiagnosisToTriage: (result: {
    condition: string;
    confidence: number;
    urgency: 'ROUTINE_GREEN' | 'URGENT_YELLOW' | 'EMERGENCY_RED';
    symptomsToAdd: string[];
    clinicalNote: string;
    mlResult: EdgeMLInferenceResult;
  }) => void;
  currentPatientName: string;
}

export const AcousticScannerSimulator: React.FC<AcousticScannerSimulatorProps> = ({
  onApplyDiagnosisToTriage,
  currentPatientName,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<'CRACKLES' | 'WHEEZING' | 'NORMAL'>('CRACKLES');
  const [scanResult, setScanResult] = useState<{
    condition: string;
    confidence: number;
    urgency: 'ROUTINE_GREEN' | 'URGENT_YELLOW' | 'EMERGENCY_RED';
    symptomsToAdd: string[];
    clinicalNote: string;
    mlResult: EdgeMLInferenceResult;
  } | null>(null);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          finishScan();
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  const finishScan = () => {
    let result: {
      condition: string;
      confidence: number;
      urgency: 'ROUTINE_GREEN' | 'URGENT_YELLOW' | 'EMERGENCY_RED';
      symptomsToAdd: string[];
      clinicalNote: string;
      mlResult: EdgeMLInferenceResult;
    };

    if (selectedPreset === 'CRACKLES') {
      result = {
        condition: 'Severe Bilateral Basilar Crackles (Pneumonia Pattern)',
        confidence: 0.93,
        urgency: 'EMERGENCY_RED',
        symptomsToAdd: ['Stridor / Wheezing', 'Shortness of Breath', 'Persistent Cough'],
        clinicalNote: 'Dual-ONNX auscultation confirmed prominent inspiratory fine crackles in right lower lung zone with tachypneic shallow cycle.',
        mlResult: {
          condition: 'Severe Bilateral Basilar Crackles (Pneumonia Pattern)',
          confidence: 0.93,
          triageRecommendation: 'EMERGENCY_RED',
          inferenceTimeMs: 24,
          executionProvider: 'ONNX Runtime Edge-WASM',
          memoryPeakMb: 14.8,
          detectedAcousticFeatures: ['Fine inspiratory crackles (650-1200Hz)', 'Subcostal indrawing resonance'],
          modelVersion: 'onnx-resp-int8-v2.4.1',
        },
      };
    } else if (selectedPreset === 'WHEEZING') {
      result = {
        condition: 'Continuous Expiratory Wheezing (Bronchospasm / Asthma)',
        confidence: 0.89,
        urgency: 'URGENT_YELLOW',
        symptomsToAdd: ['Stridor / Wheezing', 'Persistent Cough'],
        clinicalNote: 'Dual-ONNX auscultation detected continuous high-pitched polyphonic wheezing on expiration.',
        mlResult: {
          condition: 'Continuous Expiratory Wheezing (Bronchospasm / Asthma)',
          confidence: 0.89,
          triageRecommendation: 'URGENT_YELLOW',
          inferenceTimeMs: 22,
          executionProvider: 'ONNX Runtime Edge-WASM',
          memoryPeakMb: 14.8,
          detectedAcousticFeatures: ['Polyphonic expiratory wheezes (400-800Hz)', 'Prolonged expiratory phase'],
          modelVersion: 'onnx-resp-int8-v2.4.1',
        },
      };
    } else {
      result = {
        condition: 'Clear Vesicular Breath Sounds (Normal Auscultation)',
        confidence: 0.96,
        urgency: 'ROUTINE_GREEN',
        symptomsToAdd: [],
        clinicalNote: 'Dual-ONNX auscultation recorded clear, symmetrical bilateral vesicular lung sounds.',
        mlResult: {
          condition: 'Clear Vesicular Breath Sounds (Normal Auscultation)',
          confidence: 0.96,
          triageRecommendation: 'ROUTINE_GREEN',
          inferenceTimeMs: 19,
          executionProvider: 'ONNX Runtime Edge-WASM',
          memoryPeakMb: 14.8,
          detectedAcousticFeatures: ['Normal vesicular murmur', 'Equal bilateral air entry'],
          modelVersion: 'onnx-resp-int8-v2.4.1',
        },
      };
    }
    setScanResult(result);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Dual-ONNX Acoustic Auscultation</h4>
            <p className="text-[11px] text-slate-400">Microphone Edge-ML Lung Sound Scanner for {currentPatientName}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          INT8 Offline
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-mono text-slate-400">Simulate Audio Auscultation Input:</label>
        <div className="grid grid-cols-3 gap-2">
          {(['CRACKLES', 'WHEEZING', 'NORMAL'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSelectedPreset(preset)}
              className={`p-2 rounded-lg text-left border transition-all ${
                selectedPreset === preset
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-[11px]">{preset === 'CRACKLES' ? 'Pneumonia Crackles' : preset === 'WHEEZING' ? 'Bronchial Wheeze' : 'Clear Vesicular'}</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">{preset === 'CRACKLES' ? 'High Risk' : preset === 'WHEEZING' ? 'Moderate' : 'Baseline'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center space-y-3">
        {isScanning ? (
          <div className="w-full text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono">
              <Activity className="h-4 w-4 animate-pulse" />
              <span>Analyzing Acoustic Spectrogram ({scanProgress}%)...</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startScan}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Mic className="h-4 w-4" />
            <span>Record & Process Auscultation Audio (5s)</span>
          </button>
        )}
      </div>

      {scanResult && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-300">{scanResult.condition}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              scanResult.urgency === 'EMERGENCY_RED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              scanResult.urgency === 'URGENT_YELLOW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {scanResult.urgency}
            </span>
          </div>

          <p className="text-[11px] text-slate-300">{scanResult.clinicalNote}</p>

          <button
            type="button"
            onClick={() => onApplyDiagnosisToTriage(scanResult)}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Apply Auscultation to Assessment Form</span>
          </button>
        </div>
      )}
    </div>
  );
};
