export interface Book {
  id?: number;
  title: string;
  author: string;
  genre?: string;
  year_published?: number;
  available_copies?: number;
}