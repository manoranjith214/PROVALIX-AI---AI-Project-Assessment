import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';

export interface DemoEvidenceFiles {
  sourceCodePath: string;
  sourceCodeName: string;
  sourceCodeSize: string;
  reportPath: string;
  reportName: string;
  reportSize: string;
  presentationPath: string;
  presentationName: string;
  presentationSize: string;
}

export async function generatePresentationEvidence(uploadsDir: string): Promise<DemoEvidenceFiles> {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const zipPath = path.join(uploadsDir, 'ecoforge-ai-source.zip');
  const reportPath = path.join(uploadsDir, 'ecoforge-ai-report.pdf');
  const presentationPath = path.join(uploadsDir, 'ecoforge-ai-presentation.pdf');

  // ==========================================
  // 1. GENERATE SOURCE CODE ZIP ARCHIVE
  // ==========================================
  console.log('[DemoEvidence] Generating EcoForge AI source code archive...');
  const zip = new AdmZip();

  // Root package.json
  const packageJson = {
    name: 'ecoforge-ai-platform',
    version: '1.2.0',
    description: 'EcoForge AI — Intelligent Energy Optimization and Predictive Maintenance Platform',
    main: 'dist/server.js',
    scripts: {
      dev: 'tsx watch src/server.ts',
      build: 'tsc',
      start: 'node dist/server.js',
      test: 'jest --runInBand --detectOpenHandles',
    },
    dependencies: {
      '@google/genai': '^2.24.0',
      '@prisma/client': '^5.22.0',
      '@supabase/supabase-js': '^2.45.0',
      dotenv: '^16.4.7',
      express: '^4.21.2',
      mqtt: '^5.10.1',
      pg: '^8.13.1',
      zod: '^3.24.2',
    },
    devDependencies: {
      '@types/express': '^4.17.21',
      '@types/jest': '^29.5.14',
      '@types/node': '^20.17.19',
      jest: '^29.7.0',
      supertest: '^7.0.0',
      'ts-jest': '^29.2.5',
      tsx: '^4.19.3',
      typescript: '^5.7.3',
    },
  };
  zip.addFile('package.json', Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'));

  // Root README.md
  const readmeContent = `# EcoForge AI — Intelligent Energy Optimization & Predictive Maintenance Platform

## Overview
EcoForge AI is an industrial CleanTech AI platform that combines edge telemetry ingestion, wavelet anomaly detection, and generative prescriptive maintenance. It predicts electromechanical degradation up to 72 hours prior to catastrophic failure and dynamically modulates HVAC/motor variable frequency drives (VFD) to avoid peak electricity tariffs.

## Architectural Modules
1. **Edge Telemetry Broker** (\`src/sensors/telemetryIngest.ts\`): High-throughput MQTT ingestion with timestamp synchronization and cryptographic packet validation.
2. **Vibration & Thermal Anomaly Engine** (\`src/analytics/waveletAnomalyDetector.ts\`): Time-frequency decomposition, FFT crest factor calculations, and threshold alerting based on ISO 10816 mechanical vibration standards.
3. **Dynamic Tariff Shaving Optimizer** (\`src/optimization/energyPeakShaving.ts\`): Time-of-use (TOU) tariff optimization algorithm modulating industrial energy loads.
4. **Prescriptive Diagnostic AI** (\`src/diagnostics/geminiPrescriptiveEngine.ts\`): Uses Google Gemini to generate root-cause failure advisories and step-by-step mitigation plans.
5. **Python Neural Autoencoder** (\`python/inference_worker.py\`): Multivariate PyTorch LSTM for sensor anomaly reconstruction.

## Automated Testing Suite
Automated unit and integration test suites in \`tests/energy_optimization.test.ts\` provide 94%+ test coverage across energy delta and anomaly detection algorithms.

\`\`\`bash
npm install
npm test
npm run dev
\`\`\`
`;
  zip.addFile('README.md', Buffer.from(readmeContent, 'utf-8'));

  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      moduleResolution: 'node',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*', 'tests/**/*'],
  };
  zip.addFile('tsconfig.json', Buffer.from(JSON.stringify(tsconfig, null, 2), 'utf-8'));

  // src/sensors/telemetryIngest.ts
  const telemetryCode = `export interface SensorTelemetryPacket {
  deviceId: string;
  timestamp: number;
  vibrationRmsMmS: number;
  acousticDecibels: number;
  statorTemperatureC: number;
  phaseCurrentAmperes: number;
  vfdSpeedRpm: number;
}

export class TelemetryIngestionService {
  private packetBuffer: SensorTelemetryPacket[] = [];

  public validateAndBuffer(packet: SensorTelemetryPacket): boolean {
    if (!packet.deviceId || packet.vibrationRmsMmS < 0 || packet.statorTemperatureC < -20) {
      return false;
    }
    this.packetBuffer.push(packet);
    if (this.packetBuffer.length > 500) {
      this.packetBuffer.shift();
    }
    return true;
  }

  public getRecentTelemetry(deviceId: string, limit = 50): SensorTelemetryPacket[] {
    return this.packetBuffer.filter(p => p.deviceId === deviceId).slice(-limit);
  }
}
`;
  zip.addFile('src/sensors/telemetryIngest.ts', Buffer.from(telemetryCode, 'utf-8'));

  // src/analytics/waveletAnomalyDetector.ts
  const anomalyCode = `import { SensorTelemetryPacket } from '../sensors/telemetryIngest';

export interface AnomalyReport {
  isAnomaly: boolean;
  severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  vibrationDeviationZ: number;
  thermalWarning: boolean;
  isoZone: 'A_GOOD' | 'B_ACCEPTABLE' | 'C_UNSATISFACTORY' | 'D_UNACCEPTABLE';
}

export class WaveletAnomalyDetector {
  private readonly baselineMeanVib = 2.1; // mm/s
  private readonly baselineStdVib = 0.45;

  public evaluateTelemetry(packet: SensorTelemetryPacket): AnomalyReport {
    const zScore = (packet.vibrationRmsMmS - this.baselineMeanVib) / this.baselineStdVib;
    const thermalWarning = packet.statorTemperatureC > 85.0;

    let isoZone: AnomalyReport['isoZone'] = 'A_GOOD';
    if (packet.vibrationRmsMmS > 7.1) isoZone = 'D_UNACCEPTABLE';
    else if (packet.vibrationRmsMmS > 4.5) isoZone = 'C_UNSATISFACTORY';
    else if (packet.vibrationRmsMmS > 2.8) isoZone = 'B_ACCEPTABLE';

    let severity: AnomalyReport['severity'] = 'NORMAL';
    if (zScore > 3.0 || packet.vibrationRmsMmS > 7.1 || packet.statorTemperatureC > 95.0) {
      severity = 'CRITICAL';
    } else if (zScore > 2.0 || packet.vibrationRmsMmS > 4.5 || thermalWarning) {
      severity = 'ELEVATED';
    }

    return {
      isAnomaly: severity !== 'NORMAL',
      severity,
      vibrationDeviationZ: Math.round(zScore * 100) / 100,
      thermalWarning,
      isoZone,
    };
  }
}
`;
  zip.addFile('src/analytics/waveletAnomalyDetector.ts', Buffer.from(anomalyCode, 'utf-8'));

  // src/optimization/energyPeakShaving.ts
  const energyCode = `export interface TariffSchedule {
  peakHours: number[]; // e.g. [18, 19, 20, 21]
  peakRatePerKwh: number;
  offPeakRatePerKwh: number;
}

export class EnergyPeakShavingOptimizer {
  constructor(private tariff: TariffSchedule) {}

  public calculateOptimalLoad(currentHour: number, demandKw: number): { recommendedKw: number; savingsEstimate: number } {
    const isPeak = this.tariff.peakHours.includes(currentHour);
    if (!isPeak) {
      return { recommendedKw: demandKw, savingsEstimate: 0 };
    }
    // Modulate non-essential VFD load down by 22% during peak tariff hours
    const shavedDemand = Math.round(demandKw * 0.78 * 10) / 10;
    const deltaKw = demandKw - shavedDemand;
    const savings = deltaKw * (this.tariff.peakRatePerKwh - this.tariff.offPeakRatePerKwh);
    return {
      recommendedKw: shavedDemand,
      savingsEstimate: Math.round(savings * 100) / 100,
    };
  }
}
`;
  zip.addFile('src/optimization/energyPeakShaving.ts', Buffer.from(energyCode, 'utf-8'));

  // tests/energy_optimization.test.ts
  const testCode = `import { WaveletAnomalyDetector } from '../src/analytics/waveletAnomalyDetector';
import { EnergyPeakShavingOptimizer } from '../src/optimization/energyPeakShaving';

describe('EcoForge AI Core Analytics Test Suite', () => {
  const detector = new WaveletAnomalyDetector();
  const optimizer = new EnergyPeakShavingOptimizer({
    peakHours: [18, 19, 20, 21],
    peakRatePerKwh: 0.28,
    offPeakRatePerKwh: 0.11,
  });

  test('Correctly identifies normal baseline vibration', () => {
    const report = detector.evaluateTelemetry({
      deviceId: 'CHILLER-01',
      timestamp: Date.now(),
      vibrationRmsMmS: 2.2,
      acousticDecibels: 68,
      statorTemperatureC: 62,
      phaseCurrentAmperes: 34,
      vfdSpeedRpm: 1450,
    });
    expect(report.severity).toBe('NORMAL');
    expect(report.isoZone).toBe('A_GOOD');
  });

  test('Flags critical bearing degradation exceeding ISO limits', () => {
    const report = detector.evaluateTelemetry({
      deviceId: 'CHILLER-01',
      timestamp: Date.now(),
      vibrationRmsMmS: 8.4,
      acousticDecibels: 89,
      statorTemperatureC: 98,
      phaseCurrentAmperes: 52,
      vfdSpeedRpm: 1450,
    });
    expect(report.severity).toBe('CRITICAL');
    expect(report.isoZone).toBe('D_UNACCEPTABLE');
    expect(report.thermalWarning).toBe(true);
  });

  test('Performs 22% load shaving during peak electricity hours', () => {
    const peakResult = optimizer.calculateOptimalLoad(19, 100);
    expect(peakResult.recommendedKw).toBe(78);
    expect(peakResult.savingsEstimate).toBeGreaterThan(0);

    const offPeakResult = optimizer.calculateOptimalLoad(10, 100);
    expect(offPeakResult.recommendedKw).toBe(100);
    expect(offPeakResult.savingsEstimate).toBe(0);
  });
});
`;
  zip.addFile('tests/energy_optimization.test.ts', Buffer.from(testCode, 'utf-8'));

  // python/inference_worker.py
  const pythonCode = `"""
EcoForge AI - Multivariate LSTM Anomaly Reconstruction Worker
"""
import math
import json

class LSTMReconstructionModel:
    def __init__(self, latent_dim=16):
        self.latent_dim = latent_dim
        self.reconstruction_threshold = 0.045

    def predict_reconstruction_error(self, sequence_batch):
        # Calculates Euclidean reconstruction delta over sliding 50-step window
        if not sequence_batch:
            return 0.0
        norm_sum = sum(x**2 for x in sequence_batch)
        mse = math.sqrt(norm_sum / len(sequence_batch))
        return mse

    def is_anomaly(self, sequence_batch):
        error = self.predict_reconstruction_error(sequence_batch)
        return error > self.reconstruction_threshold

if __name__ == '__main__':
    model = LSTMReconstructionModel()
    sample = [0.012, 0.014, 0.019, 0.088, 0.124]
    print(f"Sample Anomaly Detected: {model.is_anomaly(sample)}")
`;
  zip.addFile('python/inference_worker.py', Buffer.from(pythonCode, 'utf-8'));

  zip.writeZip(zipPath);
  const zipStats = fs.statSync(zipPath);
  const zipSizeStr = `${(zipStats.size / 1024).toFixed(1)} KB`;

  // ==========================================
  // 2. GENERATE PROJECT REPORT PDF
  // ==========================================
  console.log('[DemoEvidence] Generating EcoForge AI formal project report PDF...');
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    // Header banner
    doc.rect(50, 45, 495, 3).fill('#059669');

    doc.fillColor('#0F172A').fontSize(20).font('Helvetica-Bold')
      .text('EcoForge AI — Project Evaluation Report', 50, 60);

    doc.fillColor('#475569').fontSize(10).font('Helvetica')
      .text('Intelligent Energy Optimization & Predictive Maintenance Platform', 50, 85);

    doc.fontSize(8).fillColor('#64748B')
      .text('Document Ref: PRV-REPORT-ECOFORGE-2026 | Capstone Final Submission', 50, 102);

    doc.moveDown(2);

    // Section 1
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('1. Abstract & Problem Formulation');
    doc.moveDown(0.4);
    doc.fillColor('#334155').fontSize(9).font('Helvetica').text(
      'Industrial manufacturing and high-density commercial infrastructure dissipate between 18% and 27% of overall electrical consumption in unoptimized motor, chiller, and compressor loads. Concurrently, unplanned mechanical breakdown represents the single largest contributor to manufacturing downtime, averaging $260,000 per hour across heavy industrial sectors.\n\n' +
      'EcoForge AI addresses this dual vulnerability by harmonizing real-time ISO 10816 vibration FFT telemetry, thermal sensor ingestion, and deep-learning LSTM anomaly detection with generative Gemini prescriptive maintenance. Concurrently, an algorithmic peak-shaving scheduler modulates variable frequency drives (VFDs) during peak electricity tariffs without interrupting production SLAs.'
    );

    doc.moveDown(1.5);

    // Section 2
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('2. System Architecture & Telemetry Pipeline');
    doc.moveDown(0.4);
    doc.fillColor('#334155').fontSize(9).font('Helvetica').text(
      'The platform employs a distributed, edge-native microservices architecture comprising four integrated tiers:\n' +
      '• Telemetry Ingestion Layer: High-throughput MQTT broker ingesting 100Hz vibration, acoustic, stator temperature, and current phase telemetry.\n' +
      '• Edge Anomaly Detection: Sub-millisecond wavelet decomposition and crest-factor computation flagging non-stationary transient anomalies.\n' +
      '• Cloud Inference & Generative Remediation: PyTorch multivariate autoencoder coupled with Google Gemini API to produce root-cause advisories and maintenance checklists.\n' +
      '• Web Presentation Layer: Responsive React/TypeScript dashboard displaying real-time telemetry spectrograms, energy savings deltas, and audit-ready ESG carbon footprint reports.'
    );

    doc.moveDown(1.5);

    // Section 3
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('3. Empirical Evaluation & Quantitative Results');
    doc.moveDown(0.4);
    doc.fillColor('#334155').fontSize(9).font('Helvetica').text(
      'Across a 30-day continuous test bench deployment monitoring three 75kW industrial induction chillers, EcoForge AI achieved:\n' +
      '• Anomaly Detection Precision: 94.2% true-positive alert rate across bearing degradation and stator overheating faults.\n' +
      '• Advance Warning Lead Time: Average 72.4 hours advance detection prior to threshold excursion.\n' +
      '• Energy Cost Reduction: 21.4% reduction in peak-hour electricity expenditure via automated load shedding.\n' +
      '• Automated Test Coverage: 94% test branch coverage across unit and API integration suites.'
    );

    doc.moveDown(1.5);

    // Section 4
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('4. Academic References & Technical Standards');
    doc.moveDown(0.4);
    doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(
      '[1] ISO 10816-3: Mechanical vibration — Evaluation of machine vibration by measurements on non-rotating parts.\n' +
      '[2] IEEE Trans. on Industrial Informatics: Deep Autoencoder Architectures for Predictive Motor Maintenance (2024).\n' +
      '[3] IEC 60034-14: Rotating electrical machines — Mechanical vibration of certain machines with shaft heights >= 56 mm.'
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', (err) => reject(err));
  });

  const reportStats = fs.statSync(reportPath);
  const reportSizeStr = `${(reportStats.size / 1024).toFixed(1)} KB`;

  // ==========================================
  // 3. GENERATE PRESENTATION SLIDES PDF
  // ==========================================
  console.log('[DemoEvidence] Generating EcoForge AI presentation slides PDF...');
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: [792, 612] }); // Landscape
    const stream = fs.createWriteStream(presentationPath);
    doc.pipe(stream);

    // Slide 1: Title Slide
    doc.rect(0, 0, 792, 612).fill('#0F172A');
    doc.fillColor('#10B981').fontSize(14).font('Helvetica-Bold').text('FINAL CAPSTONE DEFENSE — 2026', 60, 180);
    doc.fillColor('#F8FAFC').fontSize(28).font('Helvetica-Bold').text('EcoForge AI', 60, 210);
    doc.fillColor('#94A3B8').fontSize(18).font('Helvetica').text('Intelligent Energy Optimization & Predictive Maintenance Platform', 60, 255);
    doc.fillColor('#38BDF8').fontSize(12).font('Helvetica').text('Presenter: Alex Morgan (Captain) | Team: EcoForge Dynamics', 60, 340);
    doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('Department of Artificial Intelligence & Data Science | Apex Institute', 60, 365);

    // Slide 2: Problem & Motivation
    doc.addPage({ margin: 40, size: [792, 612] });
    doc.rect(0, 0, 792, 612).fill('#0F172A');
    doc.fillColor('#10B981').fontSize(14).font('Helvetica-Bold').text('01 | THE INDUSTRIAL CHALLENGE', 60, 60);
    doc.fillColor('#F8FAFC').fontSize(24).font('Helvetica-Bold').text('Unplanned Downtime & Peak Energy Waste', 60, 90);
    doc.fillColor('#CBD5E1').fontSize(14).font('Helvetica').text(
      '• Industrial facilities waste $50B+ annually in reactive repairs and peak electricity tariffs.\n\n' +
      '• Traditional SCADA systems alert operators only AFTER vibration or temperature thresholds are breached.\n\n' +
      '• Lack of automated root-cause failure diagnostics slows technician response times.\n\n' +
      '• No coordinated coordination between dynamic electrical grid pricing and heavy industrial equipment schedules.',
      60, 160, { width: 672, lineGap: 10 }
    );

    // Slide 3: Proposed Architecture
    doc.addPage({ margin: 40, size: [792, 612] });
    doc.rect(0, 0, 792, 612).fill('#0F172A');
    doc.fillColor('#10B981').fontSize(14).font('Helvetica-Bold').text('02 | TECHNICAL ARCHITECTURE', 60, 60);
    doc.fillColor('#F8FAFC').fontSize(24).font('Helvetica-Bold').text('Edge Telemetry + Wavelet Anomaly + Gemini Prescriptive AI', 60, 90);
    doc.fillColor('#CBD5E1').fontSize(14).font('Helvetica').text(
      '1. High-frequency 100Hz MQTT sensor telemetry stream (vibration, acoustics, phase current).\n\n' +
      '2. Sub-millisecond ISO 10816 wavelet crest factor evaluation at edge.\n\n' +
      '3. Cloud LSTM autoencoder for multivariate reconstruction.\n\n' +
      '4. Gemini generative LLM integration for conversational failure diagnostics and corrective actions.\n\n' +
      '5. Real-time React dashboard with peak-tariff shaving controller.',
      60, 160, { width: 672, lineGap: 10 }
    );

    // Slide 4: Empirical Results
    doc.addPage({ margin: 40, size: [792, 612] });
    doc.rect(0, 0, 792, 612).fill('#0F172A');
    doc.fillColor('#10B981').fontSize(14).font('Helvetica-Bold').text('03 | VALIDATION & RESULTS', 60, 60);
    doc.fillColor('#F8FAFC').fontSize(24).font('Helvetica-Bold').text('Key Empirical Benchmarks & Deliverables', 60, 90);
    doc.fillColor('#CBD5E1').fontSize(14).font('Helvetica').text(
      '• 94.2% Anomaly Detection Accuracy on real-world industrial chiller test bench.\n\n' +
      '• 72-Hour Advance Warning before bearing failure threshold exceeded.\n\n' +
      '• 21.4% Electricity Cost Reduction through automated peak-load shaving.\n\n' +
      '• Complete automated Jest unit and API integration testing suite with 94%+ coverage.',
      60, 160, { width: 672, lineGap: 10 }
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', (err) => reject(err));
  });

  const presStats = fs.statSync(presentationPath);
  const presSizeStr = `${(presStats.size / 1024).toFixed(1)} KB`;

  return {
    sourceCodePath: zipPath,
    sourceCodeName: 'ecoforge-ai-source.zip',
    sourceCodeSize: zipSizeStr,
    reportPath: reportPath,
    reportName: 'ecoforge-ai-report.pdf',
    reportSize: reportSizeStr,
    presentationPath: presentationPath,
    presentationName: 'ecoforge-ai-presentation.pdf',
    presentationSize: presSizeStr,
  };
}
