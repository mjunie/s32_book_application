// // ============================================
// // File: frontend/cypress/support/commands.ts
// // ============================================
// /// <reference types="cypress" />

// // Define Book interface
// interface Book {
//   id?: number;
//   title: string;
//   author: string;
//   genre?: string;
//   year_published?: number;
//   available_copies?: number;
// }

// /**
//  * Custom Cypress Commands
//  */

// // Get element by data-cy attribute
// Cypress.Commands.add('getByCy', (selector: string) => {
//   return cy.get(`[data-cy="${selector}"]`);
// });

// // Create a book via API
// Cypress.Commands.add('createBook', (book: Partial<Book>) => {
//   const bookData = {
//     title: book.title ?? 'Test Book',
//     author: book.author ?? 'Test Author',
//     genre: book.genre ?? 'Fiction',
//     year_published: book.year_published ?? 2024,
//     available_copies: book.available_copies ?? 5,
//   };

//   return cy.request({
//     method: 'POST',
//     url: `${Cypress.env('apiUrl')}/books`,
//     body: bookData,
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   });
// });

// // Delete all books via API (for test cleanup)
// Cypress.Commands.add('deleteAllBooks', () => {
//   return cy.request({
//     method: 'GET',
//     url: `${Cypress.env('apiUrl')}/books`,
//   }).then((response) => {
//     const books = response.body.books as Book[];
//     books.forEach((book) => {
//       if (book.id) {
//         cy.request({
//           method: 'DELETE',
//           url: `${Cypress.env('apiUrl')}/books/${book.id}`,
//         });
//       }
//     });
//   });
// });

// // Wait for API call
// Cypress.Commands.add('waitForAPI', (alias: string) => {
//   return cy.wait(alias).its('response.statusCode').should('eq', 200);
// });