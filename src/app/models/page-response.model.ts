export interface PageResponse<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  data: T[];
}
