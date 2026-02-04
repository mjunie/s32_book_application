// File: app.ts
import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { trace, SpanStatusCode, context, Span } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';
import cors from 'cors';
import winston from 'winston';

const PORT: number = parseInt(process.env.PORT || '8081');
const app: Express = express();

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'books-api' },
  transports: [
    // Write all logs to file
    new winston.transports.File({ 
      filename: '/var/log/books-api/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/books-api/combined.log' 
    }),
    // Also log to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost',
  credentials: true
}));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'expressdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Qwerty@123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log database configuration (without password)
logger.info('Database configuration', {
  host: pool.options.host,
  port: pool.options.port,
  database: pool.options.database,
  user: pool.options.user,
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to database', { error: err.stack });
  } else {
    logger.info('Database connection successful');
    release();
  }
});

// Middleware
app.use(express.json());

// HTTP Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: req.body // This will log request body including book details
    });
  });
  
  next();
});

// Get tracer and meter for manual instrumentation
const tracer = trace.getTracer('books-api-tracer', '1.0.0');
const meter = metrics.getMeter('books-api-meter', '1.0.0');

// Create custom metrics
const bookOperationCounter = meter.createCounter('books.operations', {
  description: 'Count of book operations',
  unit: 'operations',
});

const bookOperationDuration = meter.createHistogram('books.operation.duration', {
  description: 'Duration of book operations',
  unit: 'ms',
});

// Types
interface Book {
  id?: number;
  title: string;
  author: string;
  genre?: string;
  year_published?: number;
  available_copies?: number;
}

// Helper function to add custom spans with error handling
async function executeWithSpan<T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span: Span) => {
    const startTime = Date.now();
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }

      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });

      const duration = Date.now() - startTime;
      bookOperationDuration.record(duration, attributes || {});

      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    logger.info('Health check successful');
    res.json({ status: 'healthy', database: 'connected', service: 'books-api' });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// CREATE - Add a new book
app.post('/books', async (req: Request, res: Response) => {
  const { title, author, genre, year_published, available_copies } = req.body;

  if (!title || !author) {
    logger.warn('Book creation failed - missing required fields', { 
      title, 
      author 
    });
    return res.status(400).json({ error: 'Title and author are required' });
  }

  try {
    logger.info('Creating new book', {
      operation: 'CREATE_BOOK',
      title,
      author,
      genre,
      year_published,
      available_copies
    });

    const result = await executeWithSpan(
      'db.insert.books',
      async () => {
        return await pool.query(
          `INSERT INTO books (title, author, genre, year_published, available_copies) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [title, author, genre, year_published, available_copies || 1]
        );
      },
      {
        'db.operation': 'INSERT',
        'db.table': 'books',
        'db.system': 'postgresql',
        'book.title': title,
        'book.author': author,
      }
    );

    bookOperationCounter.add(1, { operation: 'create', status: 'success' });

    logger.info('Book created successfully', {
      operation: 'CREATE_BOOK_SUCCESS',
      bookId: result.rows[0].id,
      title: result.rows[0].title,
      author: result.rows[0].author
    });

    res.status(201).json({
      message: 'Book created successfully',
      book: result.rows[0],
    });
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'create', status: 'error' });
    logger.error('Error creating book', {
      operation: 'CREATE_BOOK_ERROR',
      title,
      author,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to create book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// READ - Get all books
app.get('/books', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all books', { operation: 'GET_ALL_BOOKS' });

    const result = await executeWithSpan(
      'db.select.books.all',
      async () => {
        return await pool.query('SELECT * FROM books ORDER BY id DESC');
      },
      {
        'db.operation': 'SELECT',
        'db.table': 'books',
        'db.system': 'postgresql',
      }
    );

    bookOperationCounter.add(1, { operation: 'read_all', status: 'success' });

    logger.info('Books fetched successfully', {
      operation: 'GET_ALL_BOOKS_SUCCESS',
      count: result.rows.length
    });
    logger.info('Fetched all books', { books: result.rows });
    res.json({
      count: result.rows.length,
      books: result.rows,
    });
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'read_all', status: 'error' });
    logger.error('Error fetching books', {
      operation: 'GET_ALL_BOOKS_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to fetch books',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// READ - Get a single book by ID
app.get('/books/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    logger.warn('Invalid book ID provided', { id: req.params.id });
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  try {
    logger.info('Fetching book by ID', { operation: 'GET_BOOK_BY_ID', bookId: id });

    const result = await executeWithSpan(
      'db.select.books.by_id',
      async () => {
        return await pool.query('SELECT * FROM books WHERE id = $1', [id]);
      },
      {
        'db.operation': 'SELECT',
        'db.table': 'books',
        'db.system': 'postgresql',
        'book.id': id,
      }
    );

    if (result.rows.length === 0) {
      bookOperationCounter.add(1, { operation: 'read_one', status: 'not_found' });
      logger.warn('Book not found', { operation: 'GET_BOOK_BY_ID_NOT_FOUND', bookId: id });
      return res.status(404).json({ error: 'Book not found' });
    }

    bookOperationCounter.add(1, { operation: 'read_one', status: 'success' });
    logger.info('Book fetched successfully', {
      operation: 'GET_BOOK_BY_ID_SUCCESS',
      bookId: id,
      title: result.rows[0].title
    });

    res.json(result.rows[0]);
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'read_one', status: 'error' });
    logger.error('Error fetching book', {
      operation: 'GET_BOOK_BY_ID_ERROR',
      bookId: id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to fetch book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// UPDATE - Update a book by ID
app.put('/books/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { title, author, genre, year_published, available_copies } = req.body;

  if (isNaN(id)) {
    logger.warn('Invalid book ID for update', { id: req.params.id });
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  try {
    logger.info('Updating book', {
      operation: 'UPDATE_BOOK',
      bookId: id,
      title,
      author,
      genre,
      year_published,
      available_copies
    });

    const result = await executeWithSpan(
      'db.update.books',
      async () => {
        return await pool.query(
          `UPDATE books 
           SET title = COALESCE($1, title),
               author = COALESCE($2, author),
               genre = COALESCE($3, genre),
               year_published = COALESCE($4, year_published),
               available_copies = COALESCE($5, available_copies)
           WHERE id = $6
           RETURNING *`,
          [title, author, genre, year_published, available_copies, id]
        );
      },
      {
        'db.operation': 'UPDATE',
        'db.table': 'books',
        'db.system': 'postgresql',
        'book.id': id,
      }
    );

    if (result.rows.length === 0) {
      bookOperationCounter.add(1, { operation: 'update', status: 'not_found' });
      logger.warn('Book not found for update', { operation: 'UPDATE_BOOK_NOT_FOUND', bookId: id });
      return res.status(404).json({ error: 'Book not found' });
    }

    bookOperationCounter.add(1, { operation: 'update', status: 'success' });

    logger.info('Book updated successfully', {
      operation: 'UPDATE_BOOK_SUCCESS',
      bookId: id,
      title: result.rows[0].title,
      author: result.rows[0].author
    });

    res.json({
      message: 'Book updated successfully',
      book: result.rows[0],
    });
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'update', status: 'error' });
    logger.error('Error updating book', {
      operation: 'UPDATE_BOOK_ERROR',
      bookId: id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to update book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE - Delete a book by ID
app.delete('/books/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    logger.warn('Invalid book ID for deletion', { id: req.params.id });
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  try {
    logger.info('Deleting book', { operation: 'DELETE_BOOK', bookId: id });

    const result = await executeWithSpan(
      'db.delete.books',
      async () => {
        return await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
      },
      {
        'db.operation': 'DELETE',
        'db.table': 'books',
        'db.system': 'postgresql',
        'book.id': id,
      }
    );

    if (result.rows.length === 0) {
      bookOperationCounter.add(1, { operation: 'delete', status: 'not_found' });
      logger.warn('Book not found for deletion', { operation: 'DELETE_BOOK_NOT_FOUND', bookId: id });
      return res.status(404).json({ error: 'Book not found' });
    }

    bookOperationCounter.add(1, { operation: 'delete', status: 'success' });

    logger.info('Book deleted successfully', {
      operation: 'DELETE_BOOK_SUCCESS',
      bookId: id,
      title: result.rows[0].title
    });

    res.json({
      message: 'Book deleted successfully',
      book: result.rows[0],
    });
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'delete', status: 'error' });
    logger.error('Error deleting book', {
      operation: 'DELETE_BOOK_ERROR',
      bookId: id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to delete book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// SEARCH - Search books by title or author
app.get('/books/search/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    logger.info('Searching books', { operation: 'SEARCH_BOOKS', searchQuery: query });

    const result = await executeWithSpan(
      'db.select.books.search',
      async () => {
        return await pool.query(
          `SELECT * FROM books 
           WHERE title ILIKE $1 OR author ILIKE $1 
           ORDER BY title`,
          [`%${query}%`]
        );
      },
      {
        'db.operation': 'SELECT',
        'db.table': 'books',
        'db.system': 'postgresql',
        'search.query': query,
      }
    );

    bookOperationCounter.add(1, { operation: 'search', status: 'success' });

    logger.info('Search completed', {
      operation: 'SEARCH_BOOKS_SUCCESS',
      searchQuery: query,
      resultsCount: result.rows.length
    });

    res.json({
      count: result.rows.length,
      query: query,
      books: result.rows,
    });
  } catch (error) {
    bookOperationCounter.add(1, { operation: 'search', status: 'error' });
    logger.error('Error searching books', {
      operation: 'SEARCH_BOOKS_ERROR',
      searchQuery: query,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to search books',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Books API started on port ${PORT}`, {
    port: PORT,
    jaegerUI: 'http://localhost:16686'
  });
  console.log(`\n🚀 Books API listening on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET    /health                - Health check');
  console.log('  POST   /books                 - Create a new book');
  console.log('  GET    /books                 - Get all books');
  console.log('  GET    /books/:id             - Get book by ID');
  console.log('  PUT    /books/:id             - Update book by ID');
  console.log('  DELETE /books/:id             - Delete book by ID');
  console.log('  GET    /books/search/:query   - Search books');
  console.log(`\n🔍 Jaeger UI available at: http://localhost:16686`);
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing connections');
  await pool.end();
  process.exit(0);
});