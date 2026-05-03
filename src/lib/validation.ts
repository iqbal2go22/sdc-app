// Per-item-UOM validation rules. POC default per D22; lives in code for now (FieldRule table reserved for FC9).
// Used by supplier UI (gating "Save & Next") and server submit endpoint.

export type UomLike = {
  uomCode: string;
  uomQuantity: number | null;
  barcode: string | null;
  barcodeWaived: boolean;
  ediUom: string | null;
  length: number | null;
  lengthUnit: string | null;
  width: number | null;
  widthUnit: string | null;
  height: number | null;
  heightUnit: string | null;
  weight: number | null;
  nestable: boolean | null;
  nestableIncrement: number | null;
};

export type ValidationIssue = { field: string; message: string };

const GTIN_RE = /^\d{12}$|^\d{13}$|^\d{14}$|^\d{18}$/;

export function validateUom(u: UomLike): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const isEach = u.uomCode === "EA";

  // UOM Quantity
  if (isEach) {
    if (u.uomQuantity !== 1) issues.push({ field: "uomQuantity", message: "Each must be 1" });
  } else if (u.uomQuantity === null || u.uomQuantity <= 0) {
    issues.push({ field: "uomQuantity", message: "Required (# eaches in this UOM)" });
  }

  // Dimensions
  if (u.length === null || u.length <= 0) issues.push({ field: "length", message: "Required" });
  if (u.lengthUnit !== "IN" && u.lengthUnit !== "FT")
    issues.push({ field: "lengthUnit", message: "IN or FT" });
  if (u.width === null || u.width <= 0) issues.push({ field: "width", message: "Required" });
  if (u.widthUnit !== "IN" && u.widthUnit !== "FT")
    issues.push({ field: "widthUnit", message: "IN or FT" });
  if (u.height === null || u.height <= 0) issues.push({ field: "height", message: "Required" });
  if (u.heightUnit !== "IN" && u.heightUnit !== "FT")
    issues.push({ field: "heightUnit", message: "IN or FT" });
  if (u.weight === null || u.weight <= 0) issues.push({ field: "weight", message: "Required (lbs)" });

  // Barcode
  if (!u.barcodeWaived) {
    if (!u.barcode) issues.push({ field: "barcode", message: "Required (or check 'No barcode')" });
    else if (!GTIN_RE.test(u.barcode))
      issues.push({ field: "barcode", message: "Must be 12, 13, 14, or 18 digits" });
  }

  // EDI UOM
  if (!u.ediUom || !/^[A-Za-z0-9]{1,4}$/.test(u.ediUom))
    issues.push({ field: "ediUom", message: "1-4 alphanumeric characters" });

  // Conditional: nestable increment
  if (u.nestable === true && (u.nestableIncrement === null || u.nestableIncrement <= 0))
    issues.push({ field: "nestableIncrement", message: "Required when nestable" });

  return issues;
}

export function defaultEdiUomFor(uomCode: string, masterEdi?: string | null): string {
  if (masterEdi && masterEdi.length > 0) return masterEdi;
  return uomCode;
}
