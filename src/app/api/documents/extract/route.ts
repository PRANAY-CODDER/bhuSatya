// MOCK EXTRACTION — for demo/study purposes only. Does not read the actual uploaded file. Replace with a real OCR/AI call before any real-world use.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const acceptedTypes = new Map([
  ["application/pdf", [".pdf"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/tiff", [".tif", ".tiff"]],
  ["image/tif", [".tif", ".tiff"]],
]);

const fieldNames = [
  "recordNo",
  "ownerName",
  "fatherName",
  "khasraNo",
  "village",
  "district",
  "state",
  "areaValue",
  "areaUnit",
  "landType",
  "mutationType",
  "sourceDoc",
  "lat",
  "lng",
  "notes",
] as const;

type ExtractedFieldName = (typeof fieldNames)[number];
type MockProfile = Record<ExtractedFieldName, string>;
type ExtractedField = { value: string; confidence: number };

const MOCK_PROFILES: MockProfile[] = [
  {
    recordNo: "LR-2025-031",
    ownerName: "Ramesh Kumar",
    fatherName: "Sh. Baldev Singh",
    khasraNo: "411/2",
    village: "Sahnewal",
    district: "Ludhiana",
    state: "Punjab",
    areaValue: "1.77",
    areaUnit: "acres",
    landType: "agricultural",
    mutationType: "inheritance",
    sourceDoc: "Jamabandi",
    lat: "30.844000",
    lng: "75.976000",
    notes: "Inherited agricultural holding.",
  },
  {
    recordNo: "LR-2025-036",
    ownerName: "Gurmeet Kaur",
    fatherName: "Sh. Joginder Singh",
    khasraNo: "612/1",
    village: "Kila Raipur",
    district: "Ludhiana",
    state: "Punjab",
    areaValue: "2.51",
    areaUnit: "acres",
    landType: "orchard",
    mutationType: "sale",
    sourceDoc: "Sale Deed",
    lat: "30.762000",
    lng: "75.815000",
    notes: "Sale mutation recorded in current jamabandi.",
  },
  {
    recordNo: "LR-2025-041",
    ownerName: "Sukhwinder Singh",
    fatherName: "Sh. Mohan Singh",
    khasraNo: "708/3",
    village: "Verka",
    district: "Amritsar",
    state: "Punjab",
    areaValue: "0.94",
    areaUnit: "kanals",
    landType: "residential",
    mutationType: "gift",
    sourceDoc: "Mutation Record",
    lat: "31.662000",
    lng: "74.930000",
    notes: "Residential parcel transferred by gift.",
  },
  {
    recordNo: "LR-2025-045",
    ownerName: "Simran Kaur Dhillon",
    fatherName: "Sh. Harjinder Singh Dhillon",
    khasraNo: "903/4",
    village: "Nabha",
    district: "Patiala",
    state: "Punjab",
    areaValue: "3.18",
    areaUnit: "acres",
    landType: "agricultural",
    mutationType: "partition",
    sourceDoc: "Khatoni",
    lat: "30.377000",
    lng: "76.147000",
    notes: "Partition entry with updated co-sharer details.",
  },
  {
    recordNo: "LR-2025-052",
    ownerName: "Amandeep Singh Gill",
    fatherName: "Sh. Surjit Singh Gill",
    khasraNo: "1042/1",
    village: "Kathu Nangal",
    district: "Amritsar",
    state: "Punjab",
    areaValue: "4.62",
    areaUnit: "acres",
    landType: "agricultural",
    mutationType: "will",
    sourceDoc: "Fard",
    lat: "31.748000",
    lng: "74.782000",
    notes: "Fard issued against registered will.",
  },
];

function getExtension(fileName: string): string {
  return fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
}

function isAcceptedFile(file: File): boolean {
  const extensions = acceptedTypes.get(file.type);
  return Boolean(extensions?.includes(getExtension(file.name)));
}

function confidenceForField(fieldName: ExtractedFieldName, lowConfidenceField: ExtractedFieldName | null): number {
  if (fieldName === lowConfidenceField) return 65 + Math.floor(Math.random() * 14);
  return 85 + Math.floor(Math.random() * 14);
}

function buildExtraction(profile: MockProfile): {
  rawText: string;
  fields: Record<ExtractedFieldName, ExtractedField>;
  ocrConfidence: number;
} {
  const lowConfidenceField = Math.random() < 0.7
    ? fieldNames[Math.floor(Math.random() * fieldNames.length)]
    : null;
  const fields = Object.fromEntries(
    fieldNames.map((fieldName) => [
      fieldName,
      { value: profile[fieldName], confidence: confidenceForField(fieldName, lowConfidenceField) },
    ]),
  ) as Record<ExtractedFieldName, ExtractedField>;
  const confidenceValues = Object.values(fields).map((field) => field.confidence);
  const ocrConfidence = Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length);

  return {
    rawText: `Punjab Revenue Department\nJAMABANDI - RECORD OF RIGHTS\nRecord No: ${profile.recordNo}\nOwner: ${profile.ownerName}\nFather name: ${profile.fatherName}\nKhasra No: ${profile.khasraNo}\nVillage: ${profile.village}\nDistrict: ${profile.district}\nArea: ${profile.areaValue} ${profile.areaUnit}\nLand type: ${profile.landType}\nMutation type: ${profile.mutationType}\nSource document: ${profile.sourceDoc}`,
    fields,
    ocrConfidence,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a file in the 'file' field." }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be non-empty and no larger than 10 MB." },
        { status: 413 },
      );
    }

    if (!isAcceptedFile(file)) {
      return NextResponse.json(
        { error: "Only PDF, JPG, JPEG, PNG, and TIFF files are accepted." },
        { status: 415 },
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.floor(Math.random() * 1301)));
    const profile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
    return NextResponse.json(buildExtraction(profile));
  } catch (error) {
    console.error("Land-record extraction failed", error);
    return NextResponse.json(
      { error: "Land-record extraction failed. Please try again." },
      { status: 500 },
    );
  }
}
