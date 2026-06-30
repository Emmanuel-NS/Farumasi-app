import type { Medicine } from "@/types";

const MIN_SCORE = 35;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function tokenize(text: string): string[] {
  return text.split(/[\s,/+\-()]+/).filter((w) => w.length > 0);
}

function similarityScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (!q || !t) return 0;

  if (t.includes(q)) {
    return 100 - Math.min(t.indexOf(q) * 2, 20);
  }

  let best = 0;
  for (const word of tokenize(t)) {
    if (word.startsWith(q)) {
      best = Math.max(best, 92 - Math.min(word.length - q.length, 10));
      continue;
    }
    if (q.length >= 3 && word.length >= 3) {
      const maxLen = Math.max(q.length, word.length);
      const dist = levenshtein(q, word);
      const ratio = 1 - dist / maxLen;
      if (ratio >= 0.55) {
        best = Math.max(best, ratio * 85);
      }
    }
  }

  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) {
    best = Math.max(best, 50 + (q.length / Math.max(t.length, 1)) * 30);
  }

  return best;
}

export interface ScoredMedicine {
  medicine: Medicine;
  score: number;
}

function scoreMedicine(medicine: Medicine, query: string): number {
  const fields: Array<{ value: string; weight: number }> = [
    { value: medicine.name, weight: 1.5 },
    { value: medicine.keywords.join(" "), weight: 1.1 },
    { value: medicine.category, weight: 0.9 },
    { value: medicine.composition ?? "", weight: 0.85 },
    { value: medicine.description, weight: 0.6 },
    { value: medicine.manufacturer, weight: 0.5 },
  ];

  let best = 0;
  for (const { value, weight } of fields) {
    if (!value) continue;
    best = Math.max(best, similarityScore(query, value) * weight);
  }
  return best;
}

export function rankMedicines(medicines: Medicine[], query: string): ScoredMedicine[] {
  const q = query.trim();
  if (!q) return medicines.map((medicine) => ({ medicine, score: 0 }));

  return medicines
    .map((medicine) => ({ medicine, score: scoreMedicine(medicine, q) }))
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

export function filterMedicinesByQuery(medicines: Medicine[], query: string): Medicine[] {
  const q = query.trim();
  if (!q) return medicines;
  return rankMedicines(medicines, q).map((row) => row.medicine);
}

export function getSearchSuggestions(
  medicines: Medicine[],
  query: string,
  limit = 8,
): ScoredMedicine[] {
  return rankMedicines(medicines, query).slice(0, limit);
}

function hasExactQueryMatch(medicines: Medicine[], query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  return medicines.some((medicine) => {
    const hay = [medicine.name, medicine.category, medicine.description, ...medicine.keywords]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Suggest a corrected spelling when the query has no exact substring matches. */
export function suggestQueryCorrection(medicines: Medicine[], query: string): string | null {
  const q = query.trim();
  if (q.length < 3) return null;
  if (hasExactQueryMatch(medicines, q)) return null;

  const ranked = rankMedicines(medicines, q);
  if (ranked.length === 0) return null;

  const topName = ranked[0].medicine.name;
  let bestWord = "";
  let bestScore = 0;

  for (const word of tokenize(topName)) {
    if (word.length < 3) continue;
    const score = similarityScore(q, word);
    if (score > bestScore) {
      bestScore = score;
      bestWord = word;
    }
  }

  if (!bestWord || bestWord.toLowerCase() === q.toLowerCase()) return null;
  if (bestScore < 50) return null;
  return bestWord;
}
