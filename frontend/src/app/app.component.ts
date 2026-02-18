
// ============================================
// File: frontend/src/app/app.component.ts
// ============================================
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BooksService } from './services/books.service';
import { Book } from './models/book.model';
import { keycloak } from './keycloak.config';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header>
        <h1>📚 Books Library Manager</h1>
        <p class="subtitle">Angular 21 + OpenTelemetry + Jaeger + Keycloak</p>

        <!-- User bar: shown once the Keycloak profile has loaded -->
        @if (userProfile()) {
          <div class="user-bar">
            <span class="user-info">
              👤 {{ userProfile().firstName }} {{ userProfile().lastName }}
              <span class="user-email">({{ userProfile().email }})</span>
            </span>
            <button (click)="logout()" class="btn btn-logout">Logout</button>
          </div>
        }
      </header>

      <div class="search-section">
        <input 
          type="text" 
          [(ngModel)]="searchQuery" 
          (keyup.enter)="onSearch()"
          placeholder="Search by title or author..."
          class="search-input"
        />
        <button (click)="onSearch()" class="btn btn-primary">Search</button>
        <button (click)="clearSearch()" class="btn btn-secondary">Clear</button>
      </div>

      <div class="form-section">
        <h2>{{ editMode() ? 'Edit Book' : 'Add New Book' }}</h2>
        <form (ngSubmit)="onSubmit()" class="book-form">
          <div class="form-row">
            <input type="text" [(ngModel)]="currentBook.title" name="title" placeholder="Title *" required class="form-input" />
            <input type="text" [(ngModel)]="currentBook.author" name="author" placeholder="Author *" required class="form-input" />
          </div>
          <div class="form-row">
            <input type="text" [(ngModel)]="currentBook.genre" name="genre" placeholder="Genre" class="form-input" />
            <input type="number" [(ngModel)]="currentBook.year_published" name="year" placeholder="Year Published" class="form-input" />
            <input type="number" [(ngModel)]="currentBook.available_copies" name="copies" placeholder="Copies" class="form-input" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-success">{{ editMode() ? 'Update Book' : 'Add Book' }}</button>
            <button type="button" (click)="resetForm()" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>

      @if (loading()) {
        <div class="message info">Loading books...</div>
      }
      @if (errorMessage()) {
        <div class="message error">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="message success">{{ successMessage() }}</div>
      }

      <div class="books-section">
        <div class="section-header">
          <h2>Books Collection ({{ books().length }})</h2>
          <button (click)="loadBooks()" class="btn btn-primary">Refresh</button>
        </div>

        @if (books().length === 0 && !loading()) {
          <div class="empty-state">
            <p>No books found. Add your first book!</p>
          </div>
        }

        <div class="books-grid">
          @for (book of books(); track book.id) {
            <div class="book-card">
              <div class="book-header">
                <h3>{{ book.title }}</h3>
                <span class="book-id">#{{ book.id }}</span>
              </div>
              <div class="book-details">
                <p><strong>Author:</strong> {{ book.author }}</p>
                @if (book.genre) {
                  <p><strong>Genre:</strong> {{ book.genre }}</p>
                }
                @if (book.year_published) {
                  <p><strong>Year:</strong> {{ book.year_published }}</p>
                }
                <p><strong>Copies:</strong> {{ book.available_copies || 0 }}</p>
              </div>
              <div class="book-actions">
                <button (click)="onEdit(book)" class="btn btn-edit">Edit</button>
                <button (click)="onDelete(book.id!)" class="btn btn-delete">Delete</button>
              </div>
            </div>
          }
        </div>
      </div>

      <footer>
        <p>🔍 View traces in <a href="/jaeger" target="_blank">Jaeger UI</a></p>
      </footer>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .container {
      max-width: 1400px; margin: 0 auto; padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa; min-height: 100vh;
    }

    header {
      text-align: center; margin-bottom: 30px; padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 1.1rem; margin-bottom: 15px; }

    /* ── User bar ── */
    .user-bar {
      display: flex; align-items: center; justify-content: center;
      gap: 15px; margin-top: 16px; padding: 10px 20px;
      background: rgba(255,255,255,0.15); border-radius: 8px;
      flex-wrap: wrap;
    }
    .user-info { font-size: 0.95rem; font-weight: 500; }
    .user-email { opacity: 0.85; font-size: 0.9rem; }
    .btn-logout {
      background: rgba(255,255,255,0.2); color: white;
      border: 2px solid rgba(255,255,255,0.5);
      padding: 6px 18px; border-radius: 6px; font-size: 0.9rem;
      cursor: pointer; font-weight: 600; transition: all 0.2s;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.35); }

    /* ── Search ── */
    .search-section {
      display: flex; gap: 10px; margin-bottom: 30px;
      background: white; padding: 20px; border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .search-input { flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; }
    .search-input:focus { outline: none; border-color: #667eea; }

    /* ── Form ── */
    .form-section { background: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .form-section h2 { margin-bottom: 20px; color: #333; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; }
    .form-input { padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; }
    .form-input:focus { outline: none; border-color: #667eea; }
    .form-actions { display: flex; gap: 10px; margin-top: 20px; }

    /* ── Buttons ── */
    .btn { padding: 12px 24px; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: all 0.3s; font-weight: 600; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .btn-primary  { background: #667eea; color: white; }
    .btn-success  { background: #48bb78; color: white; }
    .btn-secondary { background: #718096; color: white; }
    .btn-edit     { background: #4299e1; color: white; padding: 8px 16px; }
    .btn-delete   { background: #f56565; color: white; padding: 8px 16px; }

    /* ── Messages ── */
    .message { padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
    .message.info    { background: #bee3f8; color: #2c5282; }
    .message.error   { background: #fed7d7; color: #742a2a; }
    .message.success { background: #c6f6d5; color: #22543d; }

    /* ── Books grid ── */
    .books-section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .section-header h2 { color: #333; }
    .empty-state { text-align: center; padding: 60px; color: #718096; font-size: 1.2rem; }
    .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .book-card { border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; transition: all 0.3s; }
    .book-card:hover { border-color: #667eea; transform: translateY(-4px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
    .book-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0; }
    .book-header h3 { color: #2d3748; font-size: 1.3rem; flex: 1; }
    .book-id { background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
    .book-details { margin-bottom: 15px; }
    .book-details p { margin: 8px 0; color: #4a5568; line-height: 1.6; }
    .book-actions { display: flex; gap: 10px; }

    /* ── Footer ── */
    footer { text-align: center; margin-top: 40px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    footer a { color: #667eea; text-decoration: none; font-weight: 600; }
    footer a:hover { text-decoration: underline; }
  `]
})
export class AppComponent implements OnInit {
  private booksService = inject(BooksService);

  books = signal<Book[]>([]);
  editMode = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  userProfile = signal<any>(null);   // ← Keycloak user profile

  currentBook: Book = this.getEmptyBook();
  searchQuery = '';

  ngOnInit(): void {
    // Load the Keycloak user profile to display name/email in the header
    keycloak.loadUserProfile()
      .then((profile) => this.userProfile.set(profile))
      .catch((err) => console.error('Could not load user profile:', err));

    this.loadBooks();
  }

  /** Redirect to Keycloak logout, then come back to the app home */
  logout(): void {
    keycloak.logout({ redirectUri: window.location.origin + '/' });
  }

  loadBooks(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.booksService.getAllBooks().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
        console.log('✅ Books loaded:', books.length);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load books');
        this.loading.set(false);
        console.error('❌ Error:', error);
      }
    });
  }

  onSubmit(): void {
    if (!this.currentBook.title || !this.currentBook.author) {
      this.errorMessage.set('Title and Author are required');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.editMode() && this.currentBook.id) {
      this.booksService.updateBook(this.currentBook.id, this.currentBook).subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.loadBooks();
          this.resetForm();
        },
        error: () => {
          this.errorMessage.set('Failed to update book');
          this.loading.set(false);
        }
      });
    } else {
      this.booksService.createBook(this.currentBook).subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.loadBooks();
          this.resetForm();
        },
        error: () => {
          this.errorMessage.set('Failed to create book');
          this.loading.set(false);
        }
      });
    }
  }

  onEdit(book: Book): void {
    this.currentBook = { ...book };
    this.editMode.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(id: number): void {
    if (!confirm('Are you sure you want to delete this book?')) return;

    this.loading.set(true);
    this.booksService.deleteBook(id).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);
        this.loadBooks();
      },
      error: () => {
        this.errorMessage.set('Failed to delete book');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.loadBooks();
      return;
    }

    this.loading.set(true);
    this.booksService.searchBooks(this.searchQuery).subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Search failed');
        this.loading.set(false);
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadBooks();
  }

  resetForm(): void {
    this.currentBook = this.getEmptyBook();
    this.editMode.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loading.set(false);
  }

  private getEmptyBook(): Book {
    return {
      title: '',
      author: '',
      genre: '',
      year_published: undefined,
      available_copies: 1
    };
  }
}


///

// // ============================================
// // File: frontend/src/app/app.component.ts
// // ============================================
// import { Component, OnInit, inject, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { BooksService } from './services/books.service';
// import { Book } from './models/book.model';

// @Component({
//   selector: 'app-root',
//   imports: [CommonModule, FormsModule],
//   template: `
//     <div class="container">
//       <header>
//         <h1>📚 Books Library Manager</h1>
//         <p class="subtitle">Angular 21 + OpenTelemetry + Jaeger</p>
//       </header>

//       <div class="search-section">
//         <input 
//           type="text" 
//           [(ngModel)]="searchQuery" 
//           (keyup.enter)="onSearch()"
//           placeholder="Search by title or author..."
//           class="search-input"
//         />
//         <button (click)="onSearch()" class="btn btn-primary">Search</button>
//         <button (click)="clearSearch()" class="btn btn-secondary">Clear</button>
//       </div>

//       <div class="form-section">
//         <h2>{{ editMode() ? 'Edit Book' : 'Add New Book' }}</h2>
//         <form (ngSubmit)="onSubmit()" class="book-form">
//           <div class="form-row">
//             <input type="text" [(ngModel)]="currentBook.title" name="title" placeholder="Title *" required class="form-input" />
//             <input type="text" [(ngModel)]="currentBook.author" name="author" placeholder="Author *" required class="form-input" />
//           </div>
//           <div class="form-row">
//             <input type="text" [(ngModel)]="currentBook.genre" name="genre" placeholder="Genre" class="form-input" />
//             <input type="number" [(ngModel)]="currentBook.year_published" name="year" placeholder="Year Published" class="form-input" />
//             <input type="number" [(ngModel)]="currentBook.available_copies" name="copies" placeholder="Copies" class="form-input" />
//           </div>
//           <div class="form-actions">
//             <button type="submit" class="btn btn-success">{{ editMode() ? 'Update Book' : 'Add Book' }}</button>
//             <button type="button" (click)="resetForm()" class="btn btn-secondary">Cancel</button>
//           </div>
//         </form>
//       </div>

//       @if (loading()) {
//         <div class="message info">Loading books...</div>
//       }
//       @if (errorMessage()) {
//         <div class="message error">{{ errorMessage() }}</div>
//       }
//       @if (successMessage()) {
//         <div class="message success">{{ successMessage() }}</div>
//       }

//       <div class="books-section">
//         <div class="section-header">
//           <h2>Books Collection ({{ books().length }})</h2>
//           <button (click)="loadBooks()" class="btn btn-primary">Refresh</button>
//         </div>

//         @if (books().length === 0 && !loading()) {
//           <div class="empty-state">
//             <p>No books found. Add your first book!</p>
//           </div>
//         }

//         <div class="books-grid">
//           @for (book of books(); track book.id) {
//             <div class="book-card">
//               <div class="book-header">
//                 <h3>{{ book.title }}</h3>
//                 <span class="book-id">#{{ book.id }}</span>
//               </div>
//               <div class="book-details">
//                 <p><strong>Author:</strong> {{ book.author }}</p>
//                 @if (book.genre) {
//                   <p><strong>Genre:</strong> {{ book.genre }}</p>
//                 }
//                 @if (book.year_published) {
//                   <p><strong>Year:</strong> {{ book.year_published }}</p>
//                 }
//                 <p><strong>Copies:</strong> {{ book.available_copies || 0 }}</p>
//               </div>
//               <div class="book-actions">
//                 <button (click)="onEdit(book)" class="btn btn-edit">Edit</button>
//                 <button (click)="onDelete(book.id!)" class="btn btn-delete">Delete</button>
//               </div>
//             </div>
//           }
//         </div>
//       </div>

//       <footer>
//         <p>🔍 View traces in <a href="/jaeger" target="_blank">Jaeger UI</a></p>
//       </footer>
//     </div>
//   `,
//   styles: [`
//     * { box-sizing: border-box; margin: 0; padding: 0; }
//     .container { max-width: 1400px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; min-height: 100vh; }
//     header { text-align: center; margin-bottom: 30px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
//     header h1 { font-size: 2.5rem; margin-bottom: 10px; }
//     .subtitle { opacity: 0.9; font-size: 1.1rem; }
//     .search-section { display: flex; gap: 10px; margin-bottom: 30px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
//     .search-input { flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; }
//     .search-input:focus { outline: none; border-color: #667eea; }
//     .form-section { background: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
//     .form-section h2 { margin-bottom: 20px; color: #333; }
//     .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; }
//     .form-input { padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 1rem; }
//     .form-input:focus { outline: none; border-color: #667eea; }
//     .form-actions { display: flex; gap: 10px; margin-top: 20px; }
//     .btn { padding: 12px 24px; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: all 0.3s; font-weight: 600; }
//     .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
//     .btn-primary { background: #667eea; color: white; }
//     .btn-success { background: #48bb78; color: white; }
//     .btn-secondary { background: #718096; color: white; }
//     .btn-edit { background: #4299e1; color: white; padding: 8px 16px; }
//     .btn-delete { background: #f56565; color: white; padding: 8px 16px; }
//     .message { padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
//     .message.info { background: #bee3f8; color: #2c5282; }
//     .message.error { background: #fed7d7; color: #742a2a; }
//     .message.success { background: #c6f6d5; color: #22543d; }
//     .books-section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
//     .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
//     .section-header h2 { color: #333; }
//     .empty-state { text-align: center; padding: 60px; color: #718096; font-size: 1.2rem; }
//     .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
//     .book-card { border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; transition: all 0.3s; }
//     .book-card:hover { border-color: #667eea; transform: translateY(-4px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
//     .book-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0; }
//     .book-header h3 { color: #2d3748; font-size: 1.3rem; flex: 1; }
//     .book-id { background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
//     .book-details { margin-bottom: 15px; }
//     .book-details p { margin: 8px 0; color: #4a5568; line-height: 1.6; }
//     .book-actions { display: flex; gap: 10px; }
//     footer { text-align: center; margin-top: 40px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
//     footer a { color: #667eea; text-decoration: none; font-weight: 600; }
//     footer a:hover { text-decoration: underline; }
//   `]
// })
// export class AppComponent implements OnInit {
//   private booksService = inject(BooksService);

//   books = signal<Book[]>([]);
//   editMode = signal(false);
//   loading = signal(false);
//   errorMessage = signal('');
//   successMessage = signal('');
  
//   currentBook: Book = this.getEmptyBook();
//   searchQuery = '';

//   ngOnInit(): void {
//     this.loadBooks();
//   }

//   loadBooks(): void {
//     this.loading.set(true);
//     this.errorMessage.set('');

//     this.booksService.getAllBooks().subscribe({
//       next: (books) => {
//         this.books.set(books);
//         this.loading.set(false);
//         console.log('✅ Books loaded:', books.length);
//       },
//       error: (error) => {
//         this.errorMessage.set('Failed to load books');
//         this.loading.set(false);
//         console.error('❌ Error:', error);
//       }
//     });
//   }

//   onSubmit(): void {
//     if (!this.currentBook.title || !this.currentBook.author) {
//       this.errorMessage.set('Title and Author are required');
//       return;
//     }

//     this.loading.set(true);
//     this.errorMessage.set('');
//     this.successMessage.set('');

//     if (this.editMode() && this.currentBook.id) {
//       this.booksService.updateBook(this.currentBook.id, this.currentBook).subscribe({
//         next: (response) => {
//           this.successMessage.set(response.message);
//           this.loadBooks();
//           this.resetForm();
//         },
//         error: () => {
//           this.errorMessage.set('Failed to update book');
//           this.loading.set(false);
//         }
//       });
//     } else {
//       this.booksService.createBook(this.currentBook).subscribe({
//         next: (response) => {
//           this.successMessage.set(response.message);
//           this.loadBooks();
//           this.resetForm();
//         },
//         error: () => {
//           this.errorMessage.set('Failed to create book');
//           this.loading.set(false);
//         }
//       });
//     }
//   }

//   onEdit(book: Book): void {
//     this.currentBook = { ...book };
//     this.editMode.set(true);
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   }

//   onDelete(id: number): void {
//     if (!confirm('Are you sure you want to delete this book?')) return;

//     this.loading.set(true);
//     this.booksService.deleteBook(id).subscribe({
//       next: (response) => {
//         this.successMessage.set(response.message);
//         this.loadBooks();
//       },
//       error: () => {
//         this.errorMessage.set('Failed to delete book');
//         this.loading.set(false);
//       }
//     });
//   }

//   onSearch(): void {
//     if (!this.searchQuery.trim()) {
//       this.loadBooks();
//       return;
//     }

//     this.loading.set(true);
//     this.booksService.searchBooks(this.searchQuery).subscribe({
//       next: (books) => {
//         this.books.set(books);
//         this.loading.set(false);
//       },
//       error: () => {
//         this.errorMessage.set('Search failed');
//         this.loading.set(false);
//       }
//     });
//   }

//   clearSearch(): void {
//     this.searchQuery = '';
//     this.loadBooks();
//   }

//   resetForm(): void {
//     this.currentBook = this.getEmptyBook();
//     this.editMode.set(false);
//     this.errorMessage.set('');
//     this.successMessage.set('');
//     this.loading.set(false);
//   }

//   private getEmptyBook(): Book {
//     return {
//       title: '',
//       author: '',
//       genre: '',
//       year_published: undefined,
//       available_copies: 1
//     };
//   }
// }