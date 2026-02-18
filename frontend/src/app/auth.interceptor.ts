import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
// import { keycloak } from './keycloak.config';
import { keycloak} from './keycloak.config';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept API calls
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  // Refresh token if it's about to expire (within 30 seconds)
  return from(keycloak.updateToken(30)).pipe(
    switchMap(() => {
      const token = keycloak.token;
      if (token) {
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(cloned);
      }
      return next(req);
    })
  );
};