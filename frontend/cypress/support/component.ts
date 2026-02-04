// Import commands.js using ES2015 syntax:
import './commands';

// Import Cypress Angular mount
import { mount } from 'cypress/angular';

// Augment the Cypress namespace to include type definitions
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);