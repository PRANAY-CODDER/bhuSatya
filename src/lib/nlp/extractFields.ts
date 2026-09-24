export type ExtractedFieldName =
  | "recordNo"
  | "ownerName"
  | "fatherName"
  | "khasraNo"
  | "village"
  | "district"
  | "state"
  | "areaValue"
  | "areaUnit"
  | "landType"
  | "mutationType"
  | "sourceDoc"
  | "lat"
  | "lng"
  | "notes";

export type ExtractedField = { value: string; confidence: number };

export type OcrEvidenceLine = {
  text: string;
  confidence: number;
};

export type FieldExtractionResult = {
  rawText: string;
  fields: Record<ExtractedFieldName, ExtractedField>;
  ocrConfidence: number;
};

type FieldDefinition = {
  labels: string[];
  regex?: RegExp[];
};

type LabelMatch = {
  start: number;
  end: number;
  quality: number;
};

type Candidate = {
  value: string;
  ocrConfidence: number;
  matchQuality: number;
  lineIndex: number;
};

const FIELD_DEFINITIONS: Record<ExtractedFieldName, FieldDefinition> = {
  recordNo: {
    labels: [
      "record no",
      "record number",
      "khata no",
      "khata number",
      "खाता संख्या",
      "खाता क्रमांक",
      "रजिस्टर नंबर",
    ],
    regex: [
      /(?:khata|खाता|record|रजिस्टर)\s*(?:no|number|संख्या|क्रमांक)?\s*[:#-]?\s*([0-9]{1,8}(?:\/[0-9]{1,4})?)/iu,
    ],
  },
  ownerName: {
    labels: [
      "owner name",
      "owner",
      "account holder name",
      "khatedar name",
      "खातेदार का नाम",
      "खातेदार",
      "भूमि स्वामी का नाम",
      "मालिक का नाम",
    ],
  },
  fatherName: {
    labels: [
      "father's name",
      "father name",
      "father",
      "पिता का नाम",
      "पिता",
      "अभिभावक का नाम",
    ],
  },
  khasraNo: {
    labels: [
      "khasra no",
      "khasra number",
      "khasra",
      "खसरा संख्या",
      "खसरा नंबर",
      "खसरा",
    ],
    regex: [
      /(?:khasra|खसरा)\s*(?:no|number|संख्या|नंबर)?\s*[:#-]?\s*([0-9]{1,8}(?:\/[0-9]{1,4})?)/iu,
    ],
  },
  village: {
    labels: ["village", "ग्राम", "गांव", "गाँव"],
  },
  district: {
    labels: ["district", "जनपद", "जिला"],
  },
  state: {
    labels: ["state", "राज्य", "प्रदेश"],
  },
  areaValue: {
    labels: ["area", "रकबा", "क्षेत्रफल", "भूमि क्षेत्रफल"],
    regex: [
      /\b([0-9]+(?:[.,][0-9]+)?)\s*(?:hectare|hectares|acre|acres|ha|bigha|एकड़|हेक्टेयर|बीघा)\b/iu,
    ],
  },
  areaUnit: {
    labels: ["area", "रकबा", "क्षेत्रफल", "भूमि क्षेत्रफल"],
    regex: [
      /\b[0-9]+(?:[.,][0-9]+)?\s*(hectare|hectares|acre|acres|ha|bigha|एकड़|हेक्टेयर|बीघा)\b/iu,
    ],
  },
  landType: {
    labels: [
      "land type",
      "type of land",
      "भूमि का प्रकार",
      "भूमि प्रकार",
      "जमीन का प्रकार",
    ],
  },
  mutationType: {
    labels: ["mutation type", "mutation", "म्यूटेशन प्रकार", "म्यूटेशन", "नामांतरण"],
  },
  sourceDoc: {
    labels: ["source document", "document type", "दस्तावेज का प्रकार", "दस्तावेज", "अभिलेख प्रकार"],
  },
  lat: {
    labels: ["latitude", "lat", "अक्षांश"],
    regex: [/(?:latitude|lat|अक्षांश)\s*[:#-]?\s*(-?[0-9]+(?:\.[0-9]+)?)/iu],
  },
  lng: {
    labels: ["longitude", "long", "lng", "देशांतर"],
    regex: [/(?:longitude|long|lng|देशांतर)\s*[:#-]?\s*(-?[0-9]+(?:\.[0-9]+)?)/iu],
  },
  notes: {
    labels: ["notes", "remarks", "टिप्पणी", "टिप्पणियां", "विवरण"],
    regex: [/(?:date|दिनांक|तारीख)\s*[:#-]?\s*(\d{1,2}[-/]\w+[-/]\d{2,4})/iu],
  },
};

const ALL_LABELS = Object.values(FIELD_DEFINITIONS).flatMap((definition) => definition.labels);
const IGNORED_LABELS = ["tehsil", "तहसील"];

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex];
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal, above, row[rightIndex - 1]) + 1;
      diagonal = above;
    }
  }
  return row[right.length];
}

function labelTokens(label: string): string[] {
  return label.trim().split(/\s+/).filter(Boolean);
}

function getExactMatch(line: string, label: string): LabelMatch | null {
  const escaped = label
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
  const match = new RegExp(`(^|[|;,])\\s*${escaped}(?=\\s|[:#-]|$)`, "iu").exec(line);
  if (!match || match.index === undefined) return null;
  return { start: match.index + match[1].length, end: match.index + match[0].length, quality: 1 };
}

function getFuzzyMatch(line: string, label: string): LabelMatch | null {
  const sourceTokens = Array.from(line.matchAll(/\S+/gu)).map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const expectedTokens = labelTokens(label);
  const expected = normalize(expectedTokens.join(""));
  if (!expected) return null;

  let best: LabelMatch | null = null;
  for (let index = 0; index < sourceTokens.length; index += 1) {
    for (const tokenCount of [expectedTokens.length, expectedTokens.length + 1]) {
      const last = sourceTokens[index + tokenCount - 1];
      if (!last) continue;
      const candidate = normalize(sourceTokens.slice(index, index + tokenCount).map((token) => token.text).join(""));
      const distance = levenshtein(expected, candidate);
      const maximumDistance = expected.length > 8 ? 2 : 1;
      if (distance > maximumDistance) continue;
      const quality = Math.max(0.65, 1 - distance / Math.max(expected.length, candidate.length));
      if (!best || quality > best.quality) {
        const trailingSeparator = last.text.match(/[:#;,–—-]+$/u)?.[0].length ?? 0;
        best = { start: sourceTokens[index].start, end: last.end - trailingSeparator, quality };
      }
    }
  }
  return best;
}

function findLabelMatch(line: string, labels: string[]): LabelMatch | null {
  let best: LabelMatch | null = null;
  for (const label of labels) {
    const match = getExactMatch(line, label) ?? getFuzzyMatch(line, label);
    if (match && (
      !best
      || (match.start === best.start && match.end > best.end)
      || (match.quality > best.quality && match.start !== best.start)
    )) best = match;
  }
  return best;
}

function cleanValue(value: string): string {
  return value.replace(/^[\s:;,#|–—-]+|[\s|]+$/gu, "").trim();
}

function looksLikeLabel(line: string): boolean {
  return [...ALL_LABELS, ...IGNORED_LABELS].some((label) => Boolean(getExactMatch(line, label) ?? getFuzzyMatch(line, label)));
}

function normalizeFieldValue(fieldName: ExtractedFieldName, value: string): string {
  if (fieldName === "areaValue") {
    return value.match(/[0-9]+(?:[.,][0-9]+)?/u)?.[0]?.replace(",", ".") ?? value;
  }
  if (fieldName === "areaUnit") {
    const unit = value.toLocaleLowerCase().match(/hectare|acre|ha|bigha|एकड़|हेक्टेयर|बीघा/iu)?.[0];
    if (!unit) return value;
    if (/acre|एकड़/iu.test(unit)) return "acres";
    if (/bigha|बीघा/iu.test(unit)) return "bigha";
    if (/hectare|ha|हेक्टेयर/iu.test(unit)) return "hectares";
    return unit;
  }
  return value;
}

function lineConfidence(lines: OcrEvidenceLine[], index: number, fallback: number): number {
  const confidence = lines[index]?.confidence;
  return typeof confidence === "number" && Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : fallback;
}

function candidateFromLabel(
  lines: OcrEvidenceLine[],
  lineIndex: number,
  match: LabelMatch,
  fallbackConfidence: number,
): Candidate | null {
  const sameLineValue = cleanValue(lines[lineIndex].text.slice(match.end));
  if (sameLineValue) {
    return {
      value: sameLineValue,
      ocrConfidence: lineConfidence(lines, lineIndex, fallbackConfidence),
      matchQuality: match.quality,
      lineIndex,
    };
  }

  const nextLine = lines[lineIndex + 1];
  if (nextLine && nextLine.text.trim() && !looksLikeLabel(nextLine.text)) {
    return {
      value: cleanValue(nextLine.text),
      ocrConfidence: lineConfidence(lines, lineIndex + 1, fallbackConfidence),
      matchQuality: match.quality,
      lineIndex: lineIndex + 1,
    };
  }
  return null;
}

function score(ocrConfidence: number, matchQuality: number): number {
  return Math.round(Math.max(0, Math.min(100, ocrConfidence * 0.5 + matchQuality * 100 * 0.5)));
}

function regexCandidate(
  lines: OcrEvidenceLine[],
  patterns: RegExp[],
  fallbackConfidence: number,
): Candidate | null {
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (const pattern of patterns) {
      const match = pattern.exec(lines[lineIndex].text);
      if (match?.[1]) {
        return {
          value: cleanValue(match[1]),
          ocrConfidence: lineConfidence(lines, lineIndex, fallbackConfidence),
          matchQuality: 0.55,
          lineIndex,
        };
      }
    }
  }
  return null;
}

function emptyFields(): Record<ExtractedFieldName, ExtractedField> {
  return Object.fromEntries(
    Object.keys(FIELD_DEFINITIONS).map((fieldName) => [fieldName, { value: "", confidence: 0 }]),
  ) as Record<ExtractedFieldName, ExtractedField>;
}

export function extractFields(
  rawText: string,
  evidenceLines: OcrEvidenceLine[] = [],
  ocrConfidence = 0,
): FieldExtractionResult {
  const lines = evidenceLines.length > 0
    ? evidenceLines
    : rawText.split(/\r?\n/gu).map((text) => ({ text, confidence: ocrConfidence }));
  const fields = emptyFields();

  for (const [fieldName, definition] of Object.entries(FIELD_DEFINITIONS) as [ExtractedFieldName, FieldDefinition][]) {
    let candidate: Candidate | null = null;
    for (let lineIndex = 0; lineIndex < lines.length && !candidate; lineIndex += 1) {
      const labelMatch = findLabelMatch(lines[lineIndex].text, definition.labels);
      if (labelMatch) candidate = candidateFromLabel(lines, lineIndex, labelMatch, ocrConfidence);
    }
    candidate ??= definition.regex ? regexCandidate(lines, definition.regex, ocrConfidence) : null;
    if (candidate) {
      fields[fieldName] = {
        value: normalizeFieldValue(fieldName, candidate.value),
        confidence: score(candidate.ocrConfidence, candidate.matchQuality),
      };
    }
  }

  return { rawText, fields, ocrConfidence };
}
