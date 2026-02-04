CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  year_published INT,
  available_copies INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO books (title, author, genre, year_published, available_copies) VALUES
  ('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 1925, 5),
  ('To Kill a Mockingbird', 'Harper Lee', 'Fiction', 1960, 3),
  ('1984', 'George Orwell', 'Dystopian', 1949, 4),
  ('Pride and Prejudice', 'Jane Austen', 'Romance', 1813, 2),
  ('The Catcher in the Rye', 'J.D. Salinger', 'Fiction', 1951, 3)
ON CONFLICT DO NOTHING;
