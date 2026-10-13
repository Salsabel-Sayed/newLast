export interface DateRangeOptions {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export function buildDateRangeFilter(
  field: string,
  options: DateRangeOptions
): Record<string, unknown> {
  if (!options.dateFrom && !options.dateTo) {
    return {};
  }

  const range: Record<string, Date> = {};
  if (options.dateFrom) range.$gte = new Date(options.dateFrom);
  if (options.dateTo) range.$lte = new Date(options.dateTo);

  return { [field]: range };
}
