export interface QueryOption {
  limit: number;
  offset: number;
}

export const DefaultQueryOption: QueryOption = { limit: 25, offset: 0 };

export interface ApplyQueryOptionProps<T> {
  items: T[];
  option?: QueryOption;
}

export function applyQueryOption<T>(items: T[], option?: QueryOption) {
  option = option ?? DefaultQueryOption;
  return items.slice(option.offset, option.offset + option.limit);
}
