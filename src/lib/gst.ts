/**
 * GST calculation engine for VenueOS — Karnataka-compliant.
 *
 * Indian GST rules:
 *  - INTRA-state: CGST (half rate) + SGST (half rate), IGST = 0
 *  - INTER-state: IGST (full rate), CGST = 0, SGST = 0
 *  - For venue hire (SAC 997212), place of supply = property location.
 *    Supply type is determined by comparing propertyStateCode vs legalEntityStateCode.
 *  - Composition scheme / SEZ / overseas → zero-rated, isExempt flag set.
 *
 * All amounts are plain `number` (2dp). Convert Prisma Decimal with `.toNumber()` before calling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GstTreatment =
  | "REGISTERED_REGULAR"
  | "REGISTERED_COMPOSITION"
  | "UNREGISTERED"
  | "SEZ_WITH_PAYMENT"
  | "SEZ_WITHOUT_PAYMENT"
  | "OVERSEAS"
  | "DEEMED_EXPORT";

export type SupplyType = "INTRA" | "INTER";

export interface GstLineInput {
  amount: number;
  discountAmount: number;
  gstRatePercent: number;
  sacCode: string;
  hsnCode?: string;
  displayOrder?: number;
  description: string;
  unit: string;
  quantity: number;
  unitRate: number;
}

export interface GstLineResult {
  description: string;
  sacCode: string;
  hsnCode: string | undefined;
  quantity: number;
  unit: string;
  unitRate: number;
  amount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRatePercent: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  displayOrder: number;
}

export interface GstInvoiceSummary {
  supplyType: SupplyType;
  placeOfSupply: string;
  isExempt: boolean;
  exemptReason: string | null;
  lineItems: GstLineResult[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface QuickGstResult {
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Determine INTRA vs INTER supply type.
 *
 * For immovable property services (SAC 997212), place of supply = property location.
 * Supply is INTRA when the supplier's state (legalEntityStateCode) matches the
 * place of supply (propertyStateCode). Karnataka = "29".
 */
export function determineSupplyType(
  propertyStateCode: string,
  legalEntityStateCode: string
): { supplyType: SupplyType; placeOfSupply: string } {
  const placeOfSupply = propertyStateCode.trim();
  const supplierState = legalEntityStateCode.trim();
  const supplyType: SupplyType = placeOfSupply === supplierState ? "INTRA" : "INTER";
  return { supplyType, placeOfSupply };
}

export function isExemptSupply(treatment: GstTreatment): {
  isExempt: boolean;
  reason: string | null;
} {
  switch (treatment) {
    case "REGISTERED_COMPOSITION":
      return { isExempt: true, reason: "Supplier is under GST Composition Scheme — tax not applicable" };
    case "SEZ_WITHOUT_PAYMENT":
      return { isExempt: true, reason: "SEZ supply without payment of IGST — zero-rated" };
    case "OVERSEAS":
      return { isExempt: true, reason: "Export of service — zero-rated supply" };
    case "DEEMED_EXPORT":
      return { isExempt: true, reason: "Deemed export — zero-rated supply" };
    default:
      return { isExempt: false, reason: null };
  }
}

// ---------------------------------------------------------------------------
// Line item calculation
// ---------------------------------------------------------------------------

export function calculateGstLine(
  line: GstLineInput,
  supplyType: SupplyType,
  isExempt: boolean
): GstLineResult {
  const amount = round2(line.amount);
  const discountAmount = round2(Math.min(line.discountAmount, amount));
  const taxableAmount = round2(amount - discountAmount);
  const { gstRatePercent } = line;

  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (!isExempt && taxableAmount > 0 && gstRatePercent > 0) {
    if (supplyType === "INTRA") {
      cgstRate = round2(gstRatePercent / 2);
      sgstRate = round2(gstRatePercent / 2);
      cgstAmount = round2((taxableAmount * cgstRate) / 100);
      sgstAmount = round2((taxableAmount * sgstRate) / 100);
    } else {
      igstRate = gstRatePercent;
      igstAmount = round2((taxableAmount * igstRate) / 100);
    }
  }

  return {
    description: line.description,
    sacCode: line.sacCode,
    hsnCode: line.hsnCode,
    quantity: line.quantity,
    unit: line.unit,
    unitRate: line.unitRate,
    amount,
    discountAmount,
    taxableAmount,
    gstRatePercent,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    lineTotal: round2(taxableAmount + cgstAmount + sgstAmount + igstAmount),
    displayOrder: line.displayOrder ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Invoice-level calculation
// ---------------------------------------------------------------------------

export function calculateInvoiceGst(
  lines: GstLineInput[],
  propertyStateCode: string,
  legalEntityStateCode: string,
  supplierGstTreatment: GstTreatment = "REGISTERED_REGULAR"
): GstInvoiceSummary {
  const { supplyType, placeOfSupply } = determineSupplyType(propertyStateCode, legalEntityStateCode);
  const { isExempt, reason: exemptReason } = isExemptSupply(supplierGstTreatment);

  const lineItems = lines.map((l) => calculateGstLine(l, supplyType, isExempt));

  let subtotal = 0, discountAmount = 0, taxableAmount = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  for (const li of lineItems) {
    subtotal += li.amount;
    discountAmount += li.discountAmount;
    taxableAmount += li.taxableAmount;
    cgstAmount += li.cgstAmount;
    sgstAmount += li.sgstAmount;
    igstAmount += li.igstAmount;
  }

  subtotal = round2(subtotal);
  discountAmount = round2(discountAmount);
  taxableAmount = round2(taxableAmount);
  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
  const totalAmount = round2(taxableAmount + totalTax);

  return {
    supplyType,
    placeOfSupply,
    isExempt,
    exemptReason,
    lineItems,
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount,
  };
}

// ---------------------------------------------------------------------------
// Quick single-line GST (used in QuoteBuilder live preview)
// ---------------------------------------------------------------------------

export function quickGst(
  taxableAmount: number,
  gstRatePercent: number,
  supplyType: SupplyType,
  isExempt = false
): QuickGstResult {
  const ta = round2(taxableAmount);
  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (!isExempt && ta > 0 && gstRatePercent > 0) {
    if (supplyType === "INTRA") {
      cgstRate = round2(gstRatePercent / 2);
      sgstRate = round2(gstRatePercent / 2);
      cgstAmount = round2((ta * cgstRate) / 100);
      sgstAmount = round2((ta * sgstRate) / 100);
    } else {
      igstRate = gstRatePercent;
      igstAmount = round2((ta * igstRate) / 100);
    }
  }

  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
  return { taxableAmount: ta, cgstRate, sgstRate, igstRate, cgstAmount, sgstAmount, igstAmount, totalTax, lineTotal: round2(ta + totalTax) };
}

// ---------------------------------------------------------------------------
// GST state code reference
// ---------------------------------------------------------------------------

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

/** Format-only validation — does not call the GST portal API. */
export function isValidGstinFormat(gstin: string): boolean {
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return GSTIN_REGEX.test(gstin.toUpperCase());
}

export function stateCodeFromGstin(gstin: string): string | null {
  if (!isValidGstinFormat(gstin)) return null;
  return gstin.substring(0, 2);
}
