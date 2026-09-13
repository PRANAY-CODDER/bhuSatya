export type KnowledgeArticle = {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
};

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "ingestion",
    category: "Document ingestion",
    title: "Upload scanned handwritten registers",
    summary: "Upload-only workflow for PDF and image scans.",
    content: "Officers upload a scanned handwritten register as PDF, JPG, PNG, or WebP. No owner, khasra, village, area, or district data is typed manually. The system stores the source document metadata, creates an OCR-pending record, and sends it to pre-processing.",
    keywords: ["upload", "pdf", "image", "scan", "handwritten", "register", "document"],
  },
  {
    id: "ocr",
    category: "OCR pipeline",
    title: "OCR and handwriting extraction",
    summary: "Deskew, denoise, layout detection, script recognition and field extraction.",
    content: "The pipeline pre-processes the scan, detects page layout and writing regions, runs OCR, and sends extracted text to the AI/NLP field extractor. It targets owner name, father or guardian, khasra number, area, village, district, land type and mutation details. Every extracted field receives its own confidence score.",
    keywords: ["ocr", "handwriting", "extract", "text", "pipeline", "preprocess", "scan"],
  },
  {
    id: "nlp",
    category: "AI/NLP",
    title: "AI field extraction and scoring",
    summary: "Normalize multilingual field values and calculate confidence.",
    content: "AI/NLP maps OCR text to the land-record schema, normalizes numerals and common revenue terminology, identifies entities, and calculates a base record confidence plus per-field confidence. Low-confidence values are highlighted for human review; the original scan remains the source of truth.",
    keywords: ["ai", "nlp", "confidence", "score", "field", "owner", "khasra", "mutation"],
  },
  {
    id: "validation",
    category: "Validation",
    title: "Validation engine rules",
    summary: "Required fields, area ranges, confidence thresholds and extraction quality.",
    content: "Validation checks required fields, positive and reasonable area values, overall confidence of at least 60 percent, and at least three extracted fields above the confidence threshold. Passing records can be verified; failed records are sent to the review queue with reasons in the audit trail.",
    keywords: ["validation", "verify", "review", "rules", "threshold", "area", "quality"],
  },
  {
    id: "workflow",
    category: "Officer workflow",
    title: "Human-in-the-loop review",
    summary: "Officers review only exceptions and low-confidence fields.",
    content: "The officer does not retype the record. They inspect the source scan, compare highlighted extracted fields, correct only exceptions when necessary, and choose verify, reject, flag, or return to review. Every action creates an immutable audit event and notification.",
    keywords: ["officer", "review", "human", "verify", "reject", "flag", "audit"],
  },
  {
    id: "security",
    category: "Security and audit",
    title: "Access control and traceability",
    summary: "Authenticated sessions, protected APIs and complete audit history.",
    content: "Protected pages and APIs require an authenticated session. Passwords are hashed, session cookies are HTTP-only, upload types and size are validated, and workflow changes record actor, action, category, record number and timestamp in the audit trail.",
    keywords: ["security", "authentication", "session", "password", "audit", "access", "api"],
  },
  {
    id: "backup",
    category: "Operations",
    title: "Backup and recovery",
    summary: "Export records, audit events and notifications for recovery.",
    content: "System administrators can download a JSON backup containing records, audit events and notifications from Settings. The export is intended for offline review, recovery workflows and migration to a managed database.",
    keywords: ["backup", "recovery", "export", "restore", "operations"],
  },
  {
    id: "assistant",
    category: "Bhulekh AI",
    title: "What Bhulekh AI can help with",
    summary: "General help for the land-record digitization workspace.",
    content: "Bhulekh AI can explain document uploads, handwritten OCR, AI/NLP extraction, confidence scores, validation, officer review, GIS records, Excel exports, security, audit history, notifications, and backup recovery. Upload the original scan and let the pipeline extract the record; officers only review exceptions.",
    keywords: ["help", "what", "can", "do", "features", "bhulekh", "assistant", "system"],
  },
  {
    id: "ocr-definition",
    category: "General concepts",
    title: "What is OCR",
    summary: "OCR converts text in scanned documents into searchable data.",
    content: "OCR means Optical Character Recognition. It detects printed or handwritten characters in a scan and converts them into machine-readable text. Bhulekh combines OCR with AI/NLP to map the text into land-record fields and score extraction confidence.",
    keywords: ["what is ocr", "optical", "character", "recognition", "meaning"],
  },
  {
    id: "navigation",
    category: "Workspace help",
    title: "Where to find workspace features",
    summary: "Quick guide to the main website areas.",
    content: "Use Records for uploaded documents and review, GIS Map for parcel locations, Analytics for throughput and confidence, Audit Trail for traceability, Knowledge Bank for guidance, and Settings for API health, security, and backup export.",
    keywords: ["where", "find", "records", "map", "analytics", "settings", "navigate"],
  },
];

export function answerFromKnowledge(question: string) {
  const normalized = question.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((article) => ({
    article,
    score: article.keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 2 : 0), 0) + (normalized.includes(article.category.toLowerCase()) ? 3 : 0),
  })).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score === 0) return {
    answer: "Bhulekh AI is the workspace assistant for digitizing land records. Upload a scanned handwritten register or image; OCR reads it, AI/NLP extracts fields and confidence scores, validation checks the result, and officers review only exceptions. For a specific answer, ask about upload, OCR, scoring, validation, GIS, exports, security, audit, or backup.",
    sources: [KNOWLEDGE_BASE.find((article) => article.id === "assistant")!],
  };
  const related = scored.filter((item) => item.score > 0).slice(0, 3).map((item) => item.article);
  return { answer: `${best.article.title}: ${best.article.content}`, sources: related };
}
