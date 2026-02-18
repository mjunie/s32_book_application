import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: 'http://144.91.65.196:8080',
  realm: 'books-realm',
  clientId: 'books-frontend',
});

// import Keycloak from 'keycloak-js';

// /**
//  * Keycloak instance — shared across the entire Angular app.
//  *
//  * URL:      Your Keycloak server (proxied via Nginx to avoid mixed-content issues)
//  * realm:    The realm you created in the Keycloak admin console
//  * clientId: The public client you created for the frontend
//  *
//  * If you set up the Nginx proxy (recommended), use:
//  *   url: 'https://book.s32.horizonoes.com/auth'
//  *
//  * If you are accessing Keycloak directly (HTTP only, dev/testing):
//  *   url: 'http://144.91.65.196:8080'
//  */
// export const keycloak = new Keycloak({
//   url: 'http://144.91.65.196:8080',   // ← Change to https proxy URL once Nginx is configured
//   realm: 'books-realm',               // ← Replace with your actual realm name
//   clientId: 'books-frontend',         // ← Replace with your actual client ID
// });