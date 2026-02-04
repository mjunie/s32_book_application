import './commands';

// Prevent TypeScript errors
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to get element by data-cy attribute
       * @example cy.getByCy('submit-button')
       */
      getByCy(value: string): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Custom command to create a book via API
       * @example cy.createBook({ title: 'Test', author: 'Author' })
       */
      createBook(book: Partial<Book>): Chainable<any>;
      
      /**
       * Custom command to delete all books via API
       * @example cy.deleteAllBooks()
       */
      deleteAllBooks(): Chainable<any>;
      
      /**
       * Custom command to wait for API response
       * @example cy.waitForAPI('@getBooks')
       */
      waitForAPI(alias: string): Chainable<any>;
    }
  }
}

interface Book {
  id?: number;
  title: string;
  author: string;
  genre?: string;
  year_published?: number;
  available_copies?: number;
}

// Run before each test
beforeEach(() => {
  // Set viewport
  cy.viewport(1280, 720);
  
  // Preserve cookies between tests if needed
  // Cypress.Cookies.preserveOnce('session_id');
});

// Run after each test
afterEach(() => {
  // Clean up if needed
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // Return false to prevent the error from failing the test
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});