export type NamedOption = {
  id: string;
  name: string;
};

const SUGGESTION_LIMIT = 5;

export function suggestNames(
  options: NamedOption[],
  commonIds: string[],
  query: string,
): NamedOption[] {
  const needle = normalizeName(query);
  if (needle.length === 0) {
    return commonNames(options, commonIds);
  }

  return options
    .map((option) => ({ option, score: scoreName(needle, normalizeName(option.name)) }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.option.name.localeCompare(right.option.name, "he"),
    )
    .slice(0, SUGGESTION_LIMIT)
    .map((item) => item.option);
}

function commonNames(options: NamedOption[], commonIds: string[]): NamedOption[] {
  const byId = new Map(options.map((option) => [option.id, option]));
  const picked: NamedOption[] = [];
  const seen = new Set<string>();
  for (const id of commonIds) {
    const option = byId.get(id);
    if (option === undefined || seen.has(option.id)) {
      continue;
    }
    picked.push(option);
    seen.add(option.id);
    if (picked.length === SUGGESTION_LIMIT) {
      return picked;
    }
  }

  const rest = [...options].sort((left, right) => left.name.localeCompare(right.name, "he"));
  for (const option of rest) {
    if (seen.has(option.id)) {
      continue;
    }
    picked.push(option);
    if (picked.length === SUGGESTION_LIMIT) {
      break;
    }
  }
  return picked;
}

function scoreName(query: string, name: string): number {
  if (name === query) {
    return 1000;
  }
  if (name.startsWith(query)) {
    return 800;
  }
  const containsAt = name.indexOf(query);
  if (containsAt >= 0) {
    return 700 - containsAt;
  }
  if (closestDistance(query, name) <= 1) {
    return 500;
  }
  return 0;
}

function closestDistance(query: string, name: string): number {
  if (Math.abs(name.length - query.length) <= 1) {
    return levenshtein(query, name);
  }
  let best = query.length;
  const widths = [query.length - 1, query.length, query.length + 1].filter((width) => width > 0);
  for (const width of widths) {
    if (width > name.length) {
      continue;
    }
    for (let start = 0; start <= name.length - width; start += 1) {
      const distance = levenshtein(query, name.slice(start, start + width));
      if (distance < best) {
        best = distance;
      }
      if (best === 0) {
        return 0;
      }
    }
  }
  return best;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[\u0591-\u05C7]/g, "");
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const replacement =
        (previous[rightIndex - 1] ?? 0) +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      const deletion = (previous[rightIndex] ?? 0) + 1;
      const insertion = (current[rightIndex - 1] ?? 0) + 1;
      current[rightIndex] = Math.min(replacement, deletion, insertion);
    }
    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index] ?? 0;
    }
  }
  return previous[right.length] ?? 0;
}
