import { Injectable } from '@angular/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private tracer = trace.getTracer('books-frontend', '1.0.0');
  private initialized = false;

  constructor() {
    this.initializeOpenTelemetry();
  }

  private initializeOpenTelemetry(): void {
    if (this.initialized) return;

    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'books-frontend-angular21',
      [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
      'environment': 'production',
      'browser.language': navigator.language,
      'browser.platform': navigator.platform,
    });

    const provider = new WebTracerProvider({ resource });

    const exporter = new OTLPTraceExporter({
      url: '/v1/traces',
      headers: {},
    });

    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register({ contextManager: new ZoneContextManager() });

    registerInstrumentations({
      instrumentations: [
        getWebAutoInstrumentations({
          '@opentelemetry/instrumentation-fetch': {
            propagateTraceHeaderCorsUrls: [
              /localhost/,
              /^\/api\//,
            ],
            clearTimingResources: true,
            applyCustomAttributesOnSpan: (span, request, response) => {
              if (request.method) {
                span.setAttribute('http.request.method', request.method);
              }
              if (response && response.status) {
                span.setAttribute('http.response.status_code', response.status);
              }
            },
          },
          '@opentelemetry/instrumentation-xml-http-request': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-document-load': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-user-interaction': {
            enabled: true,
            eventNames: ['click', 'submit'],
          },
        }),
      ],
    });

    this.initialized = true;
    console.log('✅ OpenTelemetry initialized for Angular 21');
    console.log('📊 Exporting traces to: /v1/traces (via Nginx)');
  }

  startSpan(name: string, attributes?: Record<string, any>): Span {
    const span = this.tracer.startSpan(name);
    if (attributes) {
      span.setAttributes(attributes);
    }
    return span;
  }

  async executeWithSpan<T>(
    spanName: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    return this.tracer.startActiveSpan(spanName, async (span) => {
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}