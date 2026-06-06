export const DEFAULT_PAGE_SIZE = 100;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

/** Fetch every page until all rows are loaded (API max limit is usually 100). */
export async function fetchAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<PaginatedResult<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await fetchPage(offset, pageSize);
    all.push(...page.items);
    total = page.total;
    offset += pageSize;
    if (page.items.length < pageSize) break;
  }

  return all;
}
