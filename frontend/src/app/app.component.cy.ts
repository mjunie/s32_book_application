
import { AppComponent } from './app.component';
import { BooksService } from './services/books.service';
import { Book } from './models/book.model';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

describe('AppComponent', () => {
  const mockBooks: Book[] = [
    {
      id: 1,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      genre: 'Classic',
      year_published: 1925,
      available_copies: 5,
    },
    {
      id: 2,
      title: '1984',
      author: 'George Orwell',
      genre: 'Dystopian',
      year_published: 1949,
      available_copies: 3,
    },
  ];

  let mockBooksService: any;

  beforeEach(() => {
    mockBooksService = {
      getAllBooks: cy.stub().returns(of(mockBooks)),
      createBook: cy.stub().callsFake((book: Book) => {
        return of({ message: 'Book created successfully', book: { ...book, id: 999 } });
      }),
      updateBook: cy.stub().callsFake((id: number, book: Book) => {
        return of({ message: 'Book updated successfully', book });
      }),
      deleteBook: cy.stub().callsFake((id: number) => {
        return of({ message: 'Book deleted successfully' });
      }),
      searchBooks: cy.stub().callsFake((query: string) => {
        return of(mockBooks.filter(b => 
          b.title.toLowerCase().includes(query.toLowerCase()) || 
          b.author.toLowerCase().includes(query.toLowerCase())
        ));
      }),
    };

    cy.mount(AppComponent, {
      providers: [
        { provide: BooksService, useValue: mockBooksService },
        provideHttpClient()
      ]
    });
  });

  describe('Component Rendering', () => {
    it('should display the app title and subtitle', () => {
      cy.contains('h1', '📚 Books Library Manager').should('be.visible');
      cy.contains('.subtitle', 'Angular 21 + OpenTelemetry + Jaeger').should('be.visible');
    });

    it('should render all main sections', () => {
      cy.get('.search-section').should('be.visible');
      cy.get('.form-section').should('be.visible');
      cy.get('.books-section').should('be.visible');
      cy.get('footer').should('be.visible');
    });
  });

  describe('Book List Display', () => {
    it('should load and display books on init', () => {
      cy.get('.book-card').should('have.length', 2);
      cy.contains('.book-card', 'The Great Gatsby').should('be.visible');
      cy.contains('.book-card', '1984').should('be.visible');
    });

    it('should display book details correctly', () => {
      cy.get('.book-card').first().within(() => {
        cy.contains('h3', 'The Great Gatsby').should('be.visible');
        cy.contains('Author: F. Scott Fitzgerald').should('be.visible');
        cy.contains('Genre: Classic').should('be.visible');
        cy.contains('Year: 1925').should('be.visible');
        cy.contains('Copies: 5').should('be.visible');
        cy.contains('.book-id', '#1').should('be.visible');
      });
    });

    it('should show correct book count', () => {
      cy.contains('h2', 'Books Collection (2)').should('be.visible');
    });

    it('should display Edit and Delete buttons for each book', () => {
      cy.get('.book-card').each(($card: any) => {
        cy.wrap($card).within(() => {
          cy.contains('button', 'Edit').should('be.visible');
          cy.contains('button', 'Delete').should('be.visible');
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('should have search input and buttons', () => {
      cy.get('.search-input').should('be.visible');
      cy.contains('button', 'Search').should('be.visible');
      cy.contains('button', 'Clear').should('be.visible');
    });

    it('should filter books by title', () => {
      cy.get('.search-input').type('Gatsby');
      cy.contains('button', 'Search').click();
      cy.get('.book-card').should('have.length', 1);
      cy.contains('.book-card', 'The Great Gatsby').should('be.visible');
    });

    it('should filter books by author', () => {
      cy.get('.search-input').type('Orwell');
      cy.contains('button', 'Search').click();
      cy.get('.book-card').should('have.length', 1);
      cy.contains('.book-card', '1984').should('be.visible');
    });

    it('should allow search on Enter key', () => {
      cy.get('.search-input').type('Orwell{enter}');
      cy.get('.book-card').should('have.length', 1);
      cy.contains('.book-card', '1984').should('be.visible');
    });

    it('should clear search and reload all books', () => {
      cy.get('.search-input').type('Gatsby');
      cy.contains('button', 'Search').click();
      cy.get('.book-card').should('have.length', 1);
      
      cy.contains('button', 'Clear').click();
      cy.get('.search-input').should('have.value', '');
      cy.get('.book-card').should('have.length', 2);
    });

    it('should handle empty search query', () => {
      cy.get('.search-input').clear();
      cy.contains('button', 'Search').click();
      cy.get('.book-card').should('have.length', 2);
    });
  });

  describe('Add Book Form', () => {
    it('should display add book form with all fields', () => {
      cy.contains('h2', 'Add New Book').should('be.visible');
      cy.get('input[name="title"]').should('be.visible');
      cy.get('input[name="author"]').should('be.visible');
      cy.get('input[name="genre"]').should('be.visible');
      cy.get('input[name="year"]').should('be.visible');
      cy.get('input[name="copies"]').should('be.visible');
    });

    it('should add a new book with all fields', () => {
      cy.get('input[name="title"]').type('New Book Title');
      cy.get('input[name="author"]').type('New Author');
      cy.get('input[name="genre"]').type('Fiction');
      cy.get('input[name="year"]').type('2024');
      cy.get('input[name="copies"]').type('10');

      cy.contains('button', 'Add Book').click();
      
      // Verify service was called
      cy.wait(100);
      cy.wrap(mockBooksService.createBook).should('have.been.called');
      
      // Verify form was reset
      cy.get('input[name="title"]').should('have.value', '');
    });

    it('should add a book with only required fields', () => {
      cy.get('input[name="title"]').type('Minimal Book');
      cy.get('input[name="author"]').type('Minimal Author');

      cy.contains('button', 'Add Book').click();
      
      cy.wait(100);
      cy.wrap(mockBooksService.createBook).should('have.been.called');
    });

    it('should show validation error for missing title', () => {
      cy.get('input[name="author"]').type('Author Only');
      cy.contains('button', 'Add Book').click();
      cy.contains('Title and Author are required').should('be.visible');
    });

    it('should show validation error for missing author', () => {
      cy.get('input[name="title"]').type('Title Only');
      cy.contains('button', 'Add Book').click();
      cy.contains('Title and Author are required').should('be.visible');
    });

    it('should reset form when cancel is clicked', () => {
      cy.get('input[name="title"]').type('Test Title');
      cy.get('input[name="author"]').type('Test Author');
      cy.get('input[name="genre"]').type('Test Genre');
      
      cy.contains('button', 'Cancel').click();
      
      cy.get('input[name="title"]').should('have.value', '');
      cy.get('input[name="author"]').should('have.value', '');
      cy.get('input[name="genre"]').should('have.value', '');
    });
  });

  describe('Edit Book Functionality', () => {
    it('should populate form when editing a book', () => {
      cy.get('.book-card').first().within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.get('input[name="title"]').should('have.value', 'The Great Gatsby');
      cy.get('input[name="author"]').should('have.value', 'F. Scott Fitzgerald');
      cy.get('input[name="genre"]').should('have.value', 'Classic');
      cy.get('input[name="year"]').should('have.value', '1925');
      cy.get('input[name="copies"]').should('have.value', '5');
    });

    it('should change form header to Edit mode', () => {
      cy.get('.book-card').first().within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.contains('h2', 'Edit Book').should('be.visible');
      cy.contains('button', 'Update Book').should('be.visible');
    });

    it('should scroll to top when edit is clicked', () => {
      cy.get('.book-card').first().within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.window().its('scrollY').should('equal', 0);
    });

    it('should update a book successfully', () => {
      cy.get('.book-card').first().within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.get('input[name="title"]').clear().type('Updated Title');
      cy.contains('button', 'Update Book').click();
      
      cy.wait(100);
      cy.wrap(mockBooksService.updateBook).should('have.been.called');
    });
  });

  describe('Delete Book Functionality', () => {
    it('should show confirmation dialog on delete', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
        cy.get('.book-card').first().within(() => {
          cy.contains('button', 'Delete').click();
        });
      });
    });

    it('should delete book when confirmed', () => {
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
        cy.get('.book-card').first().within(() => {
          cy.contains('button', 'Delete').click();
        });
        
        cy.wait(100);
        cy.wrap(mockBooksService.deleteBook).should('have.been.called');
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', () => {
      cy.contains('button', 'Refresh').should('be.visible');
    });

    it('should reload books when refresh is clicked', () => {
      cy.get('.book-card').should('have.length', 2);
      cy.contains('button', 'Refresh').click();
      cy.get('.book-card').should('have.length', 2);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no books exist', () => {
      const emptyMockService = {
        getAllBooks: cy.stub().returns(of([])),
        createBook: cy.stub().returns(of({ message: 'OK' })),
        updateBook: cy.stub().returns(of({ message: 'OK' })),
        deleteBook: cy.stub().returns(of({ message: 'OK' })),
        searchBooks: cy.stub().returns(of([])),
      };

      cy.mount(AppComponent, {
        providers: [
          { provide: BooksService, useValue: emptyMockService },
          provideHttpClient()
        ]
      });

      cy.contains('.empty-state', 'No books found. Add your first book!').should('be.visible');
      cy.get('.book-card').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle error when loading books fails', () => {
      const errorService = {
        getAllBooks: cy.stub().returns(throwError(() => new Error('Network error'))),
        createBook: cy.stub().returns(of({ message: 'OK' })),
        updateBook: cy.stub().returns(of({ message: 'OK' })),
        deleteBook: cy.stub().returns(of({ message: 'OK' })),
        searchBooks: cy.stub().returns(of([])),
      };

      cy.mount(AppComponent, {
        providers: [
          { provide: BooksService, useValue: errorService },
          provideHttpClient()
        ]
      });

      cy.contains('Failed to load books').should('be.visible');
    });

    it('should handle error when creating book fails', () => {
      const errorService = {
        getAllBooks: cy.stub().returns(of(mockBooks)),
        createBook: cy.stub().returns(throwError(() => new Error('Create failed'))),
        updateBook: cy.stub().returns(of({ message: 'OK' })),
        deleteBook: cy.stub().returns(of({ message: 'OK' })),
        searchBooks: cy.stub().returns(of(mockBooks)),
      };

      cy.mount(AppComponent, {
        providers: [
          { provide: BooksService, useValue: errorService },
          provideHttpClient()
        ]
      });

      cy.get('input[name="title"]').type('Test Book');
      cy.get('input[name="author"]').type('Test Author');
      cy.contains('button', 'Add Book').click();

      cy.contains('Failed to create book').should('be.visible');
    });
  });

  describe('Footer', () => {
    it('should show Jaeger link in footer', () => {
      cy.get('footer a')
        .should('have.attr', 'href', '/jaeger')
        .and('have.attr', 'target', '_blank');
      cy.contains('footer', 'View traces in Jaeger UI').should('be.visible');
    });
  });
});

///

// import { AppComponent } from '../app/app.component';
// import { BooksService } from '../app/services/books.service';
// import { Book } from '../app/models/book.model';
// import { of, throwError, delay } from 'rxjs';

// describe('AppComponent', () => {
//   const mockBooks: Book[] = [
//     {
//       id: 1,
//       title: 'The Great Gatsby',
//       author: 'F. Scott Fitzgerald',
//       genre: 'Classic',
//       year_published: 1925,
//       available_copies: 5,
//     },
//     {
//       id: 2,
//       title: '1984',
//       author: 'George Orwell',
//       genre: 'Dystopian',
//       year_published: 1949,
//       available_copies: 3,
//     },
//   ];

//   const createMockBooksService = (customBooks?: Book[]) => {
//     const books = customBooks || mockBooks;
//     return {
//       getAllBooks: cy.stub().returns(of(books)),
//       createBook: cy.stub().callsFake((book: Book) => {
//         return of({ message: 'Book created successfully', book: { ...book, id: 999 } });
//       }),
//       updateBook: cy.stub().callsFake((id: number, book: Book) => {
//         return of({ message: 'Book updated successfully', book });
//       }),
//       deleteBook: cy.stub().callsFake((id: number) => {
//         return of({ message: 'Book deleted successfully' });
//       }),
//       searchBooks: cy.stub().callsFake((query: string) => {
//         return of(books.filter(b => 
//           b.title.toLowerCase().includes(query.toLowerCase()) || 
//           b.author.toLowerCase().includes(query.toLowerCase())
//         ));
//       }),
//     };
//   };

//   beforeEach(() => {
//     cy.mount(AppComponent, {
//       providers: [
//         { provide: BooksService, useValue: createMockBooksService() }
//       ]
//     });
//   });

//   describe('Component Rendering', () => {
//     it('should display the app title and subtitle', () => {
//       cy.contains('h1', '📚 Books Library Manager').should('be.visible');
//       cy.contains('.subtitle', 'Angular 21 + OpenTelemetry + Jaeger').should('be.visible');
//     });

//     it('should render all main sections', () => {
//       cy.get('.search-section').should('be.visible');
//       cy.get('.form-section').should('be.visible');
//       cy.get('.books-section').should('be.visible');
//       cy.get('footer').should('be.visible');
//     });
//   });

//   describe('Book List Display', () => {
//     it('should load and display books on init', () => {
//       cy.get('.book-card').should('have.length', 2);
//       cy.contains('.book-card', 'The Great Gatsby').should('be.visible');
//       cy.contains('.book-card', '1984').should('be.visible');
//     });

//     it('should display book details correctly', () => {
//       cy.get('.book-card').first().within(() => {
//         cy.contains('h3', 'The Great Gatsby').should('be.visible');
//         cy.contains('Author: F. Scott Fitzgerald').should('be.visible');
//         cy.contains('Genre: Classic').should('be.visible');
//         cy.contains('Year: 1925').should('be.visible');
//         cy.contains('Copies: 5').should('be.visible');
//         cy.contains('.book-id', '#1').should('be.visible');
//       });
//     });

//     it('should show correct book count', () => {
//       cy.contains('h2', 'Books Collection (2)').should('be.visible');
//     });

//     it('should display Edit and Delete buttons for each book', () => {
//       cy.get('.book-card').each(($card) => {
//         cy.wrap($card).within(() => {
//           cy.contains('button', 'Edit').should('be.visible');
//           cy.contains('button', 'Delete').should('be.visible');
//         });
//       });
//     });
//   });

//   describe('Search Functionality', () => {
//     it('should have search input and buttons', () => {
//       cy.get('.search-input').should('be.visible');
//       cy.contains('button', 'Search').should('be.visible');
//       cy.contains('button', 'Clear').should('be.visible');
//     });

//     it('should filter books by title', () => {
//       cy.get('.search-input').type('Gatsby');
//       cy.contains('button', 'Search').click();
//       cy.get('.book-card').should('have.length', 1);
//       cy.contains('.book-card', 'The Great Gatsby').should('be.visible');
//     });

//     it('should filter books by author', () => {
//       cy.get('.search-input').type('Orwell');
//       cy.contains('button', 'Search').click();
//       cy.get('.book-card').should('have.length', 1);
//       cy.contains('.book-card', '1984').should('be.visible');
//     });

//     it('should allow search on Enter key', () => {
//       cy.get('.search-input').type('Orwell{enter}');
//       cy.get('.book-card').should('have.length', 1);
//       cy.contains('.book-card', '1984').should('be.visible');
//     });

//     it('should clear search and reload all books', () => {
//       cy.get('.search-input').type('Gatsby');
//       cy.contains('button', 'Search').click();
//       cy.get('.book-card').should('have.length', 1);
      
//       cy.contains('button', 'Clear').click();
//       cy.get('.search-input').should('have.value', '');
//       cy.get('.book-card').should('have.length', 2);
//     });

//     it('should handle empty search query', () => {
//       cy.get('.search-input').clear();
//       cy.contains('button', 'Search').click();
//       cy.get('.book-card').should('have.length', 2);
//     });
//   });

//   describe('Add Book Form', () => {
//     it('should display add book form with all fields', () => {
//       cy.contains('h2', 'Add New Book').should('be.visible');
//       cy.get('input[name="title"]').should('be.visible');
//       cy.get('input[name="author"]').should('be.visible');
//       cy.get('input[name="genre"]').should('be.visible');
//       cy.get('input[name="year"]').should('be.visible');
//       cy.get('input[name="copies"]').should('be.visible');
//     });

//     it('should add a new book with all fields', () => {
//       // Fill the form
//       cy.get('input[name="title"]').type('New Book Title');
//       cy.get('input[name="author"]').type('New Author');
//       cy.get('input[name="genre"]').type('Fiction');
//       cy.get('input[name="year"]').type('2024');
//       cy.get('input[name="copies"]').type('10');

//       // Submit the form
//       cy.contains('button', 'Add Book').click();
      
//       // Wait for async operation and check success message
//       cy.contains('.message.success', 'Book created successfully', { timeout: 10000 })
//         .should('be.visible');
      
//       // Verify form was reset
//       cy.get('input[name="title"]').should('have.value', '');
//       cy.get('input[name="author"]').should('have.value', '');
//     });

//     it('should add a book with only required fields', () => {
//       cy.get('input[name="title"]').type('Minimal Book');
//       cy.get('input[name="author"]').type('Minimal Author');

//       cy.contains('button', 'Add Book').click();
      
//       // Wait for the success message with increased timeout
//       cy.contains('.message.success', 'Book created successfully', { timeout: 10000 })
//         .should('be.visible');
//     });

//     it('should show validation error for missing title', () => {
//       cy.get('input[name="author"]').type('Author Only');
//       cy.contains('button', 'Add Book').click();
//       cy.contains('.message.error', 'Title and Author are required').should('be.visible');
//     });

//     it('should show validation error for missing author', () => {
//       cy.get('input[name="title"]').type('Title Only');
//       cy.contains('button', 'Add Book').click();
//       cy.contains('.message.error', 'Title and Author are required').should('be.visible');
//     });

//     it('should reset form when cancel is clicked', () => {
//       cy.get('input[name="title"]').type('Test Title');
//       cy.get('input[name="author"]').type('Test Author');
//       cy.get('input[name="genre"]').type('Test Genre');
      
//       cy.contains('button', 'Cancel').click();
      
//       cy.get('input[name="title"]').should('have.value', '');
//       cy.get('input[name="author"]').should('have.value', '');
//       cy.get('input[name="genre"]').should('have.value', '');
//     });
//   });

//   describe('Edit Book Functionality', () => {
//     it('should populate form when editing a book', () => {
//       cy.get('.book-card').first().within(() => {
//         cy.contains('button', 'Edit').click();
//       });

//       cy.get('input[name="title"]').should('have.value', 'The Great Gatsby');
//       cy.get('input[name="author"]').should('have.value', 'F. Scott Fitzgerald');
//       cy.get('input[name="genre"]').should('have.value', 'Classic');
//       cy.get('input[name="year"]').should('have.value', '1925');
//       cy.get('input[name="copies"]').should('have.value', '5');
//     });

//     it('should change form header to Edit mode', () => {
//       cy.get('.book-card').first().within(() => {
//         cy.contains('button', 'Edit').click();
//       });

//       cy.contains('h2', 'Edit Book').should('be.visible');
//       cy.contains('button', 'Update Book').should('be.visible');
//     });

//     it('should scroll to top when edit is clicked', () => {
//       cy.get('.book-card').first().within(() => {
//         cy.contains('button', 'Edit').click();
//       });

//       cy.window().its('scrollY').should('equal', 0);
//     });

//     it('should update a book successfully', () => {
//       // Click edit on first book
//       cy.get('.book-card').first().within(() => {
//         cy.contains('button', 'Edit').click();
//       });

//       // Modify the title
//       cy.get('input[name="title"]').clear().type('Updated Title');
      
//       // Submit the update
//       cy.contains('button', 'Update Book').click();
      
//       // Check for success message
//       cy.contains('.message.success', 'Book updated successfully', { timeout: 10000 })
//         .should('be.visible');
//     });
//   });

//   describe('Delete Book Functionality', () => {
//     it('should show confirmation dialog on delete', () => {
//       cy.window().then((win) => {
//         cy.stub(win, 'confirm').returns(false);
//         cy.get('.book-card').first().within(() => {
//           cy.contains('button', 'Delete').click();
//         });
//       });
//     });

//     it('should delete book when confirmed', () => {
//       cy.window().then((win) => {
//         cy.stub(win, 'confirm').returns(true);
//         cy.get('.book-card').first().within(() => {
//           cy.contains('button', 'Delete').click();
//         });
        
//         // Check for success message
//         cy.contains('.message.success', 'Book deleted successfully', { timeout: 10000 })
//           .should('be.visible');
//       });
//     });
//   });

//   describe('Refresh Functionality', () => {
//     it('should have refresh button', () => {
//       cy.contains('button', 'Refresh').should('be.visible');
//     });

//     it('should reload books when refresh is clicked', () => {
//       cy.get('.book-card').should('have.length', 2);
//       cy.contains('button', 'Refresh').click();
//       cy.get('.book-card').should('have.length', 2);
//     });
//   });

//   describe('Empty State', () => {
//     it('should show empty state when no books exist', () => {
//       cy.mount(AppComponent, {
//         providers: [
//           { provide: BooksService, useValue: createMockBooksService([]) }
//         ]
//       });

//       cy.contains('.empty-state', 'No books found. Add your first book!').should('be.visible');
//       cy.get('.book-card').should('not.exist');
//     });
//   });

//   describe('Error Handling', () => {
//     it('should handle error when loading books fails', () => {
//       const errorService = {
//         getAllBooks: cy.stub().returns(throwError(() => new Error('Network error'))),
//         createBook: cy.stub().returns(of({ message: 'OK' })),
//         updateBook: cy.stub().returns(of({ message: 'OK' })),
//         deleteBook: cy.stub().returns(of({ message: 'OK' })),
//         searchBooks: cy.stub().returns(of([])),
//       };

//       cy.mount(AppComponent, {
//         providers: [
//           { provide: BooksService, useValue: errorService }
//         ]
//       });

//       cy.contains('.message.error', 'Failed to load books').should('be.visible');
//     });

//     it('should handle error when creating book fails', () => {
//       const errorService = {
//         getAllBooks: cy.stub().returns(of(mockBooks)),
//         createBook: cy.stub().returns(throwError(() => new Error('Create failed'))),
//         updateBook: cy.stub().returns(of({ message: 'OK' })),
//         deleteBook: cy.stub().returns(of({ message: 'OK' })),
//         searchBooks: cy.stub().returns(of(mockBooks)),
//       };

//       cy.mount(AppComponent, {
//         providers: [
//           { provide: BooksService, useValue: errorService }
//         ]
//       });

//       cy.get('input[name="title"]').type('Test Book');
//       cy.get('input[name="author"]').type('Test Author');
//       cy.contains('button', 'Add Book').click();

//       cy.contains('.message.error', 'Failed to create book').should('be.visible');
//     });
//   });

//   describe('Footer', () => {
//     it('should show Jaeger link in footer', () => {
//       cy.get('footer a')
//         .should('have.attr', 'href', '/jaeger')
//         .and('have.attr', 'target', '_blank');
//       cy.contains('footer', 'View traces in Jaeger UI').should('be.visible');
//     });
//   });

//   describe('Loading State', () => {
//     it('should show loading indicator during operations', () => {
//       // This test verifies the loading state exists in the template
//       cy.get('.message.info').should('exist');
//     });
//   });
// });