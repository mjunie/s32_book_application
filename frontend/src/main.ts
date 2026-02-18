import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './telemetry/telemetry.service';
import { keycloak } from './app/keycloak.config';
import { authInterceptor } from './app/auth.interceptor';

// Initialize telemetry before bootstrapping
new TelemetryService();

keycloak
  .init({
    onLoad: 'login-required',  // Redirect to Keycloak login if not authenticated
    checkLoginIframe: false,   // Avoids iframe issues with cross-origin Keycloak
    pkceMethod: 'S256',        // Security best practice
  })
  .then((authenticated) => {
    if (!authenticated) {
      keycloak.login();
      return;
    }

    bootstrapApplication(AppComponent, {
      providers: [
        provideHttpClient(
          withFetch(),
          withInterceptors([authInterceptor])
        ),
      ],
    }).catch((err) => console.error(err));
  })
  .catch((err) => {
    console.error('❌ Keycloak initialization failed:', err);
  });