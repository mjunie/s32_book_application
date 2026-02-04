describe('API Tests', () => {
  const apiUrl = Cypress.env('apiUrl');

  describe('Health Check', () => {
    it('should return healthy status', () => {
      cy.request(`${apiUrl}/health`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status', 'healthy');
        expect(response.body).to.have.property('database', 'connected');
      });
    });
  });

  describe('Books CRUD API', () => {
    let bookId: number;

    it('should create a book', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/books`,
        body: {
          title: 'API Test Book',
          author: 'API Test Author',
          genre: 'Test',
          year_published: 2024,
          available_copies: 1,
        },
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body).to.have.property('message');
        expect(response.body.book).to.have.property('id');
        bookId = response.body.book.id;
      });
    });

    it('should get all books', () => {
      cy.request(`${apiUrl}/books`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('books');
        expect(response.body.books).to.be.an('array');
        expect(response.body).to.have.property('count');
      });
    });

    it('should get a book by id', () => {
      cy.createBook({ title: 'Test' }).then((createResponse) => {
        const id = createResponse.body.book.id;
        cy.request(`${apiUrl}/books/${id}`).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('id', id);
          expect(response.body).to.have.property('title');
        });
      });
    });

    it('should update a book', () => {
      cy.createBook({ title: 'Original' }).then((createResponse) => {
        const id = createResponse.body.book.id;
        cy.request({
          method: 'PUT',
          url: `${apiUrl}/books/${id}`,
          body: {
            title: 'Updated Title',
            available_copies: 10,
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.book).to.have.property('title', 'Updated Title');
          expect(response.body.book).to.have.property('available_copies', 10);
        });
      });
    });

    it('should delete a book', () => {
      cy.createBook({ title: 'To Delete' }).then((createResponse) => {
        const id = createResponse.body.book.id;
        cy.request({
          method: 'DELETE',
          url: `${apiUrl}/books/${id}`,
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('message');
        });
      });
    });

    it('should search books', () => {
      cy.createBook({ title: 'Searchable Book' }).then(() => {
        cy.request(`${apiUrl}/books/search/Searchable`).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('books');
          expect(response.body.books.length).to.be.greaterThan(0);
        });
      });
    });

    it('should return 404 for non-existent book', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/books/99999`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });

    it('should return 400 for invalid book creation', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/books`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });
  });
});
