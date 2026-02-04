// This file must be imported BEFORE any other modules
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

// Enable diagnostic logging for troubleshooting
// Set to DiagLogLevel.DEBUG for more detailed logs
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configure resource attributes (service name, version, etc.)
const resource = new Resource({
  [ATTR_SERVICE_NAME]: 'books-api',
  [ATTR_SERVICE_VERSION]: '1.0.0',
  'environment': process.env.NODE_ENV || 'development',
});

// Configure OTLP Trace Exporter for Jaeger
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
});

// Configure the SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  // Metrics disabled - Jaeger is for traces only
  // For metrics, use Prometheus or another metrics backend
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize auto-instrumentation options
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation (too noisy)
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check requests
          return request.url === '/health';
        },
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: true, // Add more detailed DB info
      },
    }),
  ],
});

// Start the SDK
sdk.start();

console.log('🚀 OpenTelemetry instrumentation initialized');
console.log('📊 Exporting traces to:', process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces');
console.log('📈 Exporting metrics to:', process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics');

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});




///


// // This file must be imported BEFORE any other modules
// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// // Enable diagnostic logging for troubleshooting
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// const sdk = new NodeSDK({
//   traceExporter: new ConsoleSpanExporter(),
//   metricReader: new PeriodicExportingMetricReader({
//     exporter: new ConsoleMetricExporter(),
//   }),
//   instrumentations: [getNodeAutoInstrumentations()],
// });

// sdk.start();

// console.log('OpenTelemetry instrumentation initialized');
