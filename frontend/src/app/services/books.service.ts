import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Book } from '../models/book.model';
import { TelemetryService } from '../../telemetry/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class BooksService {
  private http = inject(HttpClient);
  private telemetry = inject(TelemetryService);
  private apiUrl = '/api/books';

  getAllBooks(): Observable<Book[]> {
    const span = this.telemetry.startSpan('books.getAll', {
      'http.method': 'GET',
      'http.url': this.apiUrl,
    });

    return this.http.get<{ books: Book[] }>(this.apiUrl).pipe(
      map(response => response.books),
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }

  getBookById(id: number): Observable<Book> {
    const span = this.telemetry.startSpan('books.getById', {
      'http.method': 'GET',
      'book.id': id,
    });

    return this.http.get<Book>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }

  createBook(book: Book): Observable<{ book: Book; message: string }> {
    const span = this.telemetry.startSpan('books.create', {
      'http.method': 'POST',
      'book.title': book.title,
      'book.author': book.author,
    });

    return this.http.post<{ book: Book; message: string }>(this.apiUrl, book).pipe(
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }

  updateBook(id: number, book: Partial<Book>): Observable<{ book: Book; message: string }> {
    const span = this.telemetry.startSpan('books.update', {
      'http.method': 'PUT',
      'book.id': id,
    });

    return this.http.put<{ book: Book; message: string }>(`${this.apiUrl}/${id}`, book).pipe(
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }

  deleteBook(id: number): Observable<{ message: string }> {
    const span = this.telemetry.startSpan('books.delete', {
      'http.method': 'DELETE',
      'book.id': id,
    });

    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }

  searchBooks(query: string): Observable<Book[]> {
    const span = this.telemetry.startSpan('books.search', {
      'http.method': 'GET',
      'search.query': query,
    });

    return this.http.get<{ books: Book[] }>(`${this.apiUrl}/search/${query}`).pipe(
      map(response => response.books),
      tap(() => {
        span.setStatus({ code: 1 });
        span.end();
      }),
      catchError((error) => {
        span.recordException(error);
        span.setStatus({ code: 2 });
        span.end();
        throw error;
      })
    );
  }
}