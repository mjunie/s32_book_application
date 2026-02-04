describe('Books Management', () => {
  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', '/api/books').as('getBooks');
    cy.intercept('POST', '/api/books').as('createBook');
    cy.intercept('PUT', '/api/books/*').as('updateBook');
    cy.intercept('DELETE', '/api/books/*').as('deleteBook');
    cy.intercept('GET', '/api/books/search/*').as('searchBooks');
    
    // Visit the app
    cy.visit('/');
    
    // Wait for initial books load
    cy.wait('@getBooks');
    
    // Wait for app to load
    cy.contains('Books Library Manager').should('be.visible');
  });

  describe('Page Load', () => {
    it('should display the main page', () => {
      cy.contains('Books Library Manager').should('be.visible');
      cy.contains('Angular 21 + OpenTelemetry + Jaeger').should('be.visible');
    });

    it('should display the search section', () => {
      cy.get('input[placeholder*="Search"]').should('be.visible');
      cy.contains('button', 'Search').should('be.visible');
      cy.contains('button', 'Clear').should('be.visible');
    });

    it('should display the add book form', () => {
      cy.get('input[name="title"]').should('be.visible');
      cy.get('input[name="author"]').should('be.visible');
      cy.get('input[name="genre"]').should('be.visible');
      cy.get('input[name="year"]').should('be.visible');
      cy.get('input[name="copies"]').should('be.visible');
    });

    it('should display the Jaeger link', () => {
      cy.contains('a', 'Jaeger UI').should('have.attr', 'href').and('include', 'jaeger');
    });
  });

  describe('Create Book', () => {
    it('should create a new book', () => {
      // Fill in the form
      cy.get('input[name="title"]').type('The Hobbit');
      cy.get('input[name="author"]').type('J.R.R. Tolkien');
      cy.get('input[name="genre"]').type('Fantasy');
      cy.get('input[name="year"]').type('1937');
      cy.get('input[name="copies"]').clear().type('10');

      // Submit
      cy.contains('button', 'Add Book').click();

      // Wait for API call and check response
      cy.wait('@createBook').then((interception) => {
        // Log the request details for debugging
        cy.log('Request URL:', interception.request.url);
        cy.log('Response Status:', interception.response?.statusCode);
        
        // If 404, the backend might not be running
        if (interception.response?.statusCode === 404) {
          throw new Error('Backend API returned 404. Is your backend server running?');
        }
        
        expect(interception.response?.statusCode).to.eq(201);
      });

      // Verify success message or book appears
      cy.contains('The Hobbit', { timeout: 10000 }).should('be.visible');
      cy.contains('J.R.R. Tolkien').should('be.visible');
    });

    it('should show error for missing required fields', () => {
      // Try to submit without filling required fields
      cy.contains('button', 'Add Book').click();

      // Should show validation message or prevent submission
      cy.get('input[name="title"]').then(($input) => {
        // Check if HTML5 validation is triggered
        const input = $input[0] as HTMLInputElement;
        expect(input.validationMessage).to.not.be.empty;
      });
    });

    it('should clear form after successful creation', () => {
      // Create a book
      cy.get('input[name="title"]').type('Test Book');
      cy.get('input[name="author"]').type('Test Author');
      cy.contains('button', 'Add Book').click();

      // Wait for creation
      cy.wait('@createBook').its('response.statusCode').should('eq', 201);

      // Wait a bit for form to clear
      cy.wait(500);

      // Verify form is cleared
      cy.get('input[name="title"]').should('have.value', '');
      cy.get('input[name="author"]').should('have.value', '');
    });
  });

  describe('Read Books', () => {
    beforeEach(() => {
      // Create test books via API
      cy.createBook({
        title: 'Book 1',
        author: 'Author 1',
        genre: 'Fiction',
        year_published: 2020,
        available_copies: 5,
      });
      cy.createBook({
        title: 'Book 2',
        author: 'Author 2',
        genre: 'Science',
        year_published: 2021,
        available_copies: 3,
      });

      // Reload page to see new books
      cy.visit('/');
      cy.wait('@getBooks');
    });

    it('should display all books', () => {
      cy.contains('Book 1').should('be.visible');
      cy.contains('Book 2').should('be.visible');
    });

    it('should display book details', () => {
      cy.contains('.book-card', 'Book 1').within(() => {
        cy.contains('Author 1').should('be.visible');
        cy.contains('Fiction').should('be.visible');
        cy.contains('2020').should('be.visible');
        cy.contains('5').should('be.visible');
      });
    });

    it('should show book count', () => {
      cy.contains(/Books Collection/).should('be.visible');
    });
  });

  describe('Update Book', () => {
    beforeEach(() => {
      // Create a test book
      cy.createBook({
        title: 'Book to Edit',
        author: 'Original Author',
        available_copies: 5,
      });
      cy.visit('/');
      cy.wait('@getBooks');
    });

    it('should edit a book', () => {
      // Click edit button
      cy.contains('.book-card', 'Book to Edit')
        .find('button')
        .contains('Edit')
        .click();

      // Verify form is populated
      cy.get('input[name="title"]').should('have.value', 'Book to Edit');

      // Change values
      cy.get('input[name="copies"]').clear().type('10');

      // Submit
      cy.contains('button', 'Update Book').click();

      // Wait for update
      cy.wait('@updateBook').its('response.statusCode').should('eq', 200);

      // Verify updated value
      cy.contains('.book-card', 'Book to Edit').within(() => {
        cy.contains('10').should('be.visible');
      });
    });

    it('should cancel edit', () => {
      // Click edit
      cy.contains('.book-card', 'Book to Edit')
        .find('button')
        .contains('Edit')
        .click();

      // Click cancel
      cy.contains('button', 'Cancel').click();

      // Verify form is cleared
      cy.get('input[name="title"]').should('have.value', '');
      cy.contains('button', 'Add Book').should('be.visible');
    });
  });

  describe('Delete Book', () => {
    beforeEach(() => {
      // Create a test book
      cy.createBook({
        title: 'Book to Delete',
        author: 'Test Author',
      });
      cy.visit('/');
      cy.wait('@getBooks');
    });

    it('should delete a book', () => {
      // Stub the confirm dialog
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Get initial book count
      cy.get('.book-card').its('length').then((initialCount) => {
        // Click delete button
        cy.contains('.book-card', 'Book to Delete')
          .find('button')
          .contains('Delete')
          .click();

        // Wait for delete
        cy.wait('@deleteBook').its('response.statusCode').should('eq', 200);

        // Wait for books to reload
        cy.wait('@getBooks');

        // Wait for the book count to decrease
        cy.get('.book-card', { timeout: 10000 }).should('have.length', initialCount - 1);

        // Verify book is removed
        cy.contains('.book-card', 'Book to Delete').should('not.exist');
      });
    });

    it('should cancel delete', () => {
      // Stub the confirm dialog to return false
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });

      // Click delete button
      cy.contains('.book-card', 'Book to Delete')
        .find('button')
        .contains('Delete')
        .click();

      // Verify book still exists
      cy.contains('Book to Delete').should('be.visible');
    });
  });

  describe('Search Books', () => {
    beforeEach(() => {
      // Create test books with different titles
      cy.createBook({ title: 'Harry Potter', author: 'J.K. Rowling' });
      cy.createBook({ title: 'Lord of the Rings', author: 'Tolkien' });
      cy.createBook({ title: 'The Hobbit', author: 'Tolkien' });
      cy.visit('/');
      cy.wait('@getBooks');
    });

    it('should search by title', () => {
      cy.get('input[placeholder*="Search"]').type('Harry');
      cy.contains('button', 'Search').click();

      // Wait for search
      cy.wait('@searchBooks');

      // Should show only Harry Potter
      cy.contains('Harry Potter').should('be.visible');
      cy.contains('Lord of the Rings').should('not.exist');
    });

    it('should search by author', () => {
      cy.get('input[placeholder*="Search"]').type('Tolkien');
      cy.contains('button', 'Search').click();

      // Wait for search
      cy.wait('@searchBooks');

      // Should show Tolkien's books
      cy.contains('Lord of the Rings').should('be.visible');
      cy.contains('The Hobbit').should('be.visible');
      cy.contains('Harry Potter').should('not.exist');
    });

    it('should clear search and show all books', () => {
      // Search for something
      cy.get('input[placeholder*="Search"]').type('Harry');
      cy.contains('button', 'Search').click();

      // Wait for search
      cy.wait('@searchBooks');

      // Clear search
      cy.contains('button', 'Clear').click();

      // Wait for all books to reload
      cy.wait('@getBooks');

      // Should show all books again
      cy.contains('Harry Potter', { timeout: 10000 }).should('be.visible');
      cy.contains('Lord of the Rings', { timeout: 10000 }).should('be.visible');
    });

    it('should handle no results', () => {
      cy.get('input[placeholder*="Search"]').type('NonExistentBook');
      cy.contains('button', 'Search').click();

      // Wait for search
      cy.wait('@searchBooks');

      // Should show empty state
      cy.contains('No books found').should('be.visible');
    });
  });

  describe('Refresh Books', () => {
    it('should refresh the book list', () => {
      // Click refresh button
      cy.contains('button', 'Refresh').click();

      // Wait for books to reload
      cy.wait('@getBooks');

      // Verify books are loaded
      cy.contains(/Books Collection/).should('be.visible');
    });
  });
});