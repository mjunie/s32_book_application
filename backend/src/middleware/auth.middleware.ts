// ============================================
// File: backend/src/middleware/auth.middleware.ts
// ============================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

//const KEYCLOAK_URL = 'http://144.91.65.196:8080';
const KEYCLOAK_URL = 'https://book.s32.horizonoes.com/auth';
const REALM = 'books-realm'; // ← Replace with your actual realm name

/**
 * Fetches Keycloak's public RSA keys automatically from the JWKS endpoint.
 * Results are cached so there's no extra network call on every request.
 */
const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
});

/**
 * Resolves the correct public key based on the token's `kid` header.
 * Used internally by jsonwebtoken's verify().
 */
function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid as string, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Express middleware that protects routes by validating the Bearer JWT token.
 *
 * Usage in app.ts:
 *   import { requireAuth } from './middleware/auth.middleware';
 *   app.use('/books', requireAuth);
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        res.status(401).json({
          error: 'Unauthorized: Invalid or expired token',
          details: err.message,
        });
        return;
      }

      // Attach decoded token payload to request for use in route handlers
      // e.g. req.user.sub = Keycloak user ID, req.user.preferred_username, etc.
      (req as any).user = decoded;
      next();
    }
  );
}
