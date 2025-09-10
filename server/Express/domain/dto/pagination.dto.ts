export interface PaginationDTO {
  cursor?: number;
  size?: number;
}

export interface PageDTO<T> {
  items: T[];
  nextCursor?: number;
}
