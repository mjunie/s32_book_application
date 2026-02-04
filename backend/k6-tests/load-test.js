// load-test.js - k6 Performance Test Suite for Books API
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const bookCreationDuration = new Trend('book_creation_duration');
const bookReadDuration = new Trend('book_read_duration');
const bookUpdateDuration = new Trend('book_update_duration');
const bookDeleteDuration = new Trend('book_delete_duration');
const totalRequests = new Counter('total_requests');

// Test configuration - adjust based on your needs
export const options = {
  stages: [
    // Ramp-up: gradually increase load
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
    
    // Sustained load: maintain steady state
    { duration: '2m', target: 20 },   // Stay at 20 users for 2 minutes
    
    // Peak load: test maximum capacity
    { duration: '30s', target: 50 },  // Spike to 50 users
    { duration: '1m', target: 50 },   // Maintain peak for 1 minute
    
    // Ramp-down: graceful decrease
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  
  thresholds: {
    // HTTP failures should be less than 1%
    'http_req_failed': ['rate<0.01'],
    
    // 95% of requests should complete within 500ms
    'http_req_duration': ['p(95)<500'],
    
    // 99% of requests should complete within 1000ms
    'http_req_duration': ['p(99)<1000'],
    
    // Error rate should be less than 1%
    'errors': ['rate<0.01'],
    
    // Average response time should be less than 300ms
    'http_req_duration': ['avg<300'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081';

// Helper function to generate random book data
function generateRandomBook() {
  const titles = ['The Great Adventure', 'Mystery Novel', 'Science Fiction Epic', 'Historical Drama', 'Fantasy Quest'];
  const authors = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Carol Davis'];
  const genres = ['Fiction', 'Mystery', 'Science Fiction', 'History', 'Fantasy'];
  
  return {
    title: `${titles[Math.floor(Math.random() * titles.length)]} ${Date.now()}`,
    author: authors[Math.floor(Math.random() * authors.length)],
    genre: genres[Math.floor(Math.random() * genres.length)],
    year_published: 2020 + Math.floor(Math.random() * 5),
    available_copies: 1 + Math.floor(Math.random() * 10),
  };
}

// Test lifecycle functions
export function setup() {
  // Health check before starting tests
  const healthRes = http.get(`${BASE_URL}/health`);
  
  if (healthRes.status !== 200) {
    throw new Error(`API health check failed. Status: ${healthRes.status}`);
  }
  
  console.log('✅ API is healthy, starting load tests...');
  
  // Create some initial test data
  const initialBooks = [];
  for (let i = 0; i < 5; i++) {
    const book = generateRandomBook();
    const res = http.post(
      `${BASE_URL}/books`,
      JSON.stringify(book),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (res.status === 201) {
      initialBooks.push(JSON.parse(res.body).book);
    }
  }
  
  return { initialBooks };
}

// Main test function - executed by each virtual user
export default function(data) {
  totalRequests.add(1);
  
  // Random scenario selection for realistic traffic patterns
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Read all books (most common operation)
    testGetAllBooks();
  } else if (scenario < 0.6) {
    // 20% - Read specific book
    testGetBookById(data);
  } else if (scenario < 0.75) {
    // 15% - Search books
    testSearchBooks();
  } else if (scenario < 0.85) {
    // 10% - Create new book
    testCreateBook();
  } else if (scenario < 0.95) {
    // 10% - Update book
    testUpdateBook(data);
  } else {
    // 5% - Delete book
    testDeleteBook(data);
  }
  
  // Think time - simulate user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Test scenarios
function testGetAllBooks() {
  const res = http.get(`${BASE_URL}/books`);
  
  const success = check(res, {
    'GET /books status is 200': (r) => r.status === 200,
    'GET /books has books array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.books);
      } catch {
        return false;
      }
    },
    'GET /books response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  bookReadDuration.add(res.timings.duration);
  errorRate.add(!success);
}

function testGetBookById(data) {
  if (!data.initialBooks || data.initialBooks.length === 0) return;
  
  const randomBook = data.initialBooks[Math.floor(Math.random() * data.initialBooks.length)];
  const res = http.get(`${BASE_URL}/books/${randomBook.id}`);
  
  const success = check(res, {
    'GET /books/:id status is 200': (r) => r.status === 200,
    'GET /books/:id returns book': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === randomBook.id;
      } catch {
        return false;
      }
    },
  });
  
  bookReadDuration.add(res.timings.duration);
  errorRate.add(!success);
}

function testSearchBooks() {
  const queries = ['Test', 'Great', 'Novel', 'Fiction', 'Mystery'];
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  const res = http.get(`${BASE_URL}/books/search/${query}`);
  
  const success = check(res, {
    'GET /books/search/:query status is 200': (r) => r.status === 200,
    'GET /books/search/:query has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.books);
      } catch {
        return false;
      }
    },
  });
  
  bookReadDuration.add(res.timings.duration);
  errorRate.add(!success);
}

function testCreateBook() {
  const book = generateRandomBook();
  
  const res = http.post(
    `${BASE_URL}/books`,
    JSON.stringify(book),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const success = check(res, {
    'POST /books status is 201': (r) => r.status === 201,
    'POST /books returns created book': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.book && body.book.title === book.title;
      } catch {
        return false;
      }
    },
    'POST /books response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  bookCreationDuration.add(res.timings.duration);
  errorRate.add(!success);
}

function testUpdateBook(data) {
  if (!data.initialBooks || data.initialBooks.length === 0) return;
  
  const randomBook = data.initialBooks[Math.floor(Math.random() * data.initialBooks.length)];
  const update = {
    available_copies: Math.floor(Math.random() * 10) + 1,
  };
  
  const res = http.put(
    `${BASE_URL}/books/${randomBook.id}`,
    JSON.stringify(update),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const success = check(res, {
    'PUT /books/:id status is 200': (r) => r.status === 200,
    'PUT /books/:id returns updated book': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.book && body.book.id === randomBook.id;
      } catch {
        return false;
      }
    },
  });
  
  bookUpdateDuration.add(res.timings.duration);
  errorRate.add(!success);
}

function testDeleteBook(data) {
  // Create a book first, then delete it
  const book = generateRandomBook();
  
  const createRes = http.post(
    `${BASE_URL}/books`,
    JSON.stringify(book),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (createRes.status !== 201) {
    errorRate.add(true);
    return;
  }
  
  const createdBook = JSON.parse(createRes.body).book;
  
  const res = http.del(`${BASE_URL}/books/${createdBook.id}`);
  
  const success = check(res, {
    'DELETE /books/:id status is 200': (r) => r.status === 200,
    'DELETE /books/:id confirms deletion': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.message && body.message.includes('deleted');
      } catch {
        return false;
      }
    },
  });
  
  bookDeleteDuration.add(res.timings.duration);
  errorRate.add(!success);
}

// Cleanup after tests
export function teardown(data) {
  console.log('🧹 Test completed, cleaning up...');
}