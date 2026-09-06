export interface QueryOption {
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

export const DefaultQueryOption: Required<QueryOption> = {
  limit: 25,
  offset: 0,
  order: "desc",
};

export interface ApplyQueryOptionProps<T> {
  items: T[];
  option?: QueryOption;
}

export function applyQueryOption<T>(items: T[], option?: QueryOption) {
  const limit = option?.limit ?? DefaultQueryOption.limit;
  const order = option?.order ?? DefaultQueryOption.order;

  let offset = option?.offset ?? DefaultQueryOption.offset;
  if (order === "desc") offset = Math.max(0, items.length - limit - offset);
  return items.slice(offset, offset + limit);
}
