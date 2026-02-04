import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './telemetry/telemetry.service';

// Initialize telemetry before bootstrapping
new TelemetryService();

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch())
  ]
}).catch((err) => console.error(err));