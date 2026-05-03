"use client";

// Port of siteone-sdc-branded.html — identifier card + horizontal UOM cards w/ 3 sections each.
// Live calc bar (Eaches per Pallet ÷ Eaches per Case = Cases per Pallet) per D-Convo.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { validateUom, type UomLike } from "@/lib/validation";
import { cn } from "@/lib/utils";

type ItemHeader = {
  skuId: string;
  pimItemNumber: string;
  productName: string;
  brandName: string | null;
  vendorName: string;
  mfgPartNumber: string | null;
  taxonomyClassPath: string | null;
  imageUrl: string | null;
  submittedAt: Date | string | null;
};

type UomState = {
  id: string;
  uomCode: string;
  uomName: string;
  defaultEdiUom: string;
  source: "FILE" | "ADDED";
  uomQuantity: number | null;
  barcode: string | null;
  barcodeWaived: boolean;
  ediUom: string | null;
  length: number | null;
  lengthUnit: string;
  width: number | null;
  widthUnit: string;
  height: number | null;
  heightUnit: string;
  weight: number | null;
  freightClass: string | null;
  nestable: boolean | null;
  nestableIncrement: number | null;
  layFlat: boolean | null;
  stackable: boolean | null;
  ti: number | null;
  hi: number | null;
};

type AddableUom = { code: string; name: string; defaultEdiUom: string };

const FREIGHT_CLASSES = [
  "50",
  "55",
  "60",
  "65",
  "70",
  "77.5",
  "85",
  "92.5",
  "100",
  "110",
  "125",
  "150",
  "175",
  "200",
  "250",
  "300",
  "400",
  "500",
];

export function ItemEditor({
  item,
  uoms: initialUoms,
  allUomsForPicker,
  navigation,
}: {
  item: ItemHeader;
  uoms: UomState[];
  allUomsForPicker: AddableUom[];
  navigation: { prev: string | null; next: string | null; position: number; total: number };
}) {
  const router = useRouter();
  const [uoms, setUoms] = useState<UomState[]>(initialUoms);
  const [mfgPart, setMfgPart] = useState<string>(item.mfgPartNumber ?? "");
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(uomCode: string, partial: Partial<UomState>) {
    setUoms((prev) => prev.map((u) => (u.uomCode === uomCode ? { ...u, ...partial } : u)));
  }

  const eachQty = uoms.find((u) => u.uomCode === "EA")?.uomQuantity ?? 1;
  const caseQty = uoms.find((u) => u.uomCode === "CS")?.uomQuantity ?? null;
  const palletQty = uoms.find((u) => u.uomCode === "PL")?.uomQuantity ?? null;
  const casesPerPallet = useMemo(() => {
    if (caseQty && palletQty && caseQty > 0) {
      return Math.round(palletQty / caseQty);
    }
    return null;
  }, [caseQty, palletQty]);

  const issuesByCode = useMemo(() => {
    const m = new Map<string, ReturnType<typeof validateUom>>();
    for (const u of uoms) {
      m.set(u.uomCode, validateUom(toUomLike(u)));
    }
    return m;
  }, [uoms]);

  const allValid = Array.from(issuesByCode.values()).every((v) => v.length === 0);

  async function save(action: "draft" | "submit") {
    setSaving(action);
    setSavedNote(null);
    try {
      const res = await fetch(`/api/supplier/items/${item.skuId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mfgPartNumber: mfgPart,
          uoms: uoms.map(serializeUom),
          submit: action === "submit",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSavedNote(data.error ?? "Save failed");
        setSaving(null);
        return;
      }
      if (action === "submit" && data.nextSkuId) {
        router.push(`/supplier/items/${data.nextSkuId}`);
        return;
      }
      setSavedNote(data.submitted ? "Submitted." : "Draft saved.");
      startTransition(() => router.refresh());
    } catch {
      setSavedNote("Network error — try again.");
    } finally {
      setSaving(null);
    }
  }

  async function removeAdded(uomCode: string) {
    if (!confirm(`Remove the ${uomCode} UOM you added? Any data entered for it will be lost.`)) return;
    setUoms((prev) => prev.filter((u) => u.uomCode !== uomCode));
  }

  function addUom(opt: AddableUom) {
    if (uoms.some((u) => u.uomCode === opt.code)) return;
    setUoms((prev) => [
      ...prev,
      {
        id: `new-${opt.code}`,
        uomCode: opt.code,
        uomName: opt.name,
        defaultEdiUom: opt.defaultEdiUom,
        source: "ADDED",
        uomQuantity: opt.code === "EA" ? 1 : null,
        barcode: null,
        barcodeWaived: false,
        ediUom: opt.defaultEdiUom,
        length: null,
        lengthUnit: "IN",
        width: null,
        widthUnit: "IN",
        height: null,
        heightUnit: "IN",
        weight: null,
        freightClass: null,
        nestable: null,
        nestableIncrement: null,
        layFlat: null,
        stackable: null,
        ti: null,
        hi: null,
      },
    ]);
    setShowAddPicker(false);
  }

  const addable = allUomsForPicker.filter((u) => !uoms.some((x) => x.uomCode === u.code));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-siteone-green-gray">
          Item {navigation.position} of {navigation.total}
        </div>
        {item.submittedAt && (
          <div className="bg-[var(--green-light)] text-siteone-green text-xs px-3 py-1 rounded font-medium">
            Submitted — read-only display below
          </div>
        )}
      </div>

      {/* ── Identifier card (image + identifiers in one wide row) ── */}
      <div className="bg-white rounded-lg shadow border-t-4 border-siteone-green flex gap-6 p-6">
        <div className="flex-shrink-0">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.productName}
              width={130}
              height={130}
              className="object-contain bg-[var(--cream)] rounded"
              style={{ width: 130, height: 130 }}
            />
          ) : (
            <div className="w-[130px] h-[130px] bg-[var(--cream)] rounded flex items-center justify-center text-xs text-siteone-warm-gray">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
          <IdField label="Product Name" value={item.productName} grow />
          <IdField label="Brand" value={item.brandName ?? "—"} />
          <IdField label="Vendor Name" value={item.vendorName} />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold">
              MFG Part #{" "}
              <span className="bg-siteone-blue text-white text-[9px] px-1 py-0.5 rounded ml-1">
                EDITABLE
              </span>
            </div>
            <input
              type="text"
              value={mfgPart}
              onChange={(e) => setMfgPart(e.target.value)}
              className="input mt-1 text-sm"
              disabled={!!item.submittedAt}
            />
          </div>
          <IdField label="Taxonomy" value={item.taxonomyClassPath ?? "—"} grow />
        </div>
      </div>

      {/* ── Live calc bar ── */}
      <div className="bg-siteone-gray text-white rounded-lg p-4 flex flex-wrap items-center gap-4 text-sm">
        <CalcChip label="Each" value={String(eachQty ?? "—")} />
        <span className="opacity-50">·</span>
        <CalcChip label="Eaches per Case" value={caseQty ? String(caseQty) : "—"} />
        <span className="opacity-50">·</span>
        <CalcChip label="Eaches per Pallet" value={palletQty ? String(palletQty) : "—"} />
        <span className="opacity-50">=</span>
        <span className="text-siteone-safety font-mono">
          {casesPerPallet
            ? `${palletQty} ÷ ${caseQty} = ${casesPerPallet} cases per pallet`
            : "Enter case & pallet quantities to compute cases per pallet"}
        </span>
      </div>

      {/* ── UOM cards — horizontal row ── */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {uoms.map((u) => (
          <UomCard
            key={u.uomCode}
            uom={u}
            issues={issuesByCode.get(u.uomCode) ?? []}
            disabled={!!item.submittedAt}
            onPatch={(p) => patch(u.uomCode, p)}
            onRemove={u.source === "ADDED" ? () => removeAdded(u.uomCode) : null}
          />
        ))}
        {!item.submittedAt && (
          <div className="flex-shrink-0 w-44">
            <button
              type="button"
              onClick={() => setShowAddPicker(true)}
              disabled={addable.length === 0}
              className="w-full h-full min-h-[400px] border-2 border-dashed border-siteone-warm-gray rounded-lg flex flex-col items-center justify-center text-siteone-warm-gray hover:border-siteone-green hover:text-siteone-green disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="text-5xl font-light">+</span>
              <span className="text-sm mt-2 font-medium">Add UOM</span>
            </button>
          </div>
        )}
      </div>

      {showAddPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-siteone-gray mb-4">Add a UOM</h3>
            {addable.length === 0 ? (
              <p className="text-sm text-siteone-warm-gray">All available UOMs are already on this item.</p>
            ) : (
              <ul className="space-y-1">
                {addable.map((opt) => (
                  <li key={opt.code}>
                    <button
                      type="button"
                      onClick={() => addUom(opt)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--off-white)] rounded flex justify-between"
                    >
                      <span className="font-mono font-semibold text-siteone-green">{opt.code}</span>
                      <span className="text-sm text-siteone-gray">{opt.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-3 border-t border-[var(--border)] text-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddPicker(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer / actions ── */}
      <div className="sticky bottom-0 bg-white border-t border-[var(--border)] -mx-6 md:-mx-12 px-6 md:px-12 py-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="text-sm">
          <div className="font-semibold text-siteone-gray">{item.productName}</div>
          <div className="text-xs text-siteone-green-gray">
            Item {navigation.position} of {navigation.total} · SKU {item.skuId}
          </div>
          {savedNote && <div className="text-xs text-siteone-green mt-1">{savedNote}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!item.submittedAt && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => save("draft")}
                disabled={saving !== null}
              >
                {saving === "draft" ? "Saving…" : "Save Draft"}
              </button>
              {navigation.prev && (
                <a href={`/supplier/items/${navigation.prev}`} className="btn-secondary">
                  ← Prev
                </a>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={!allValid || saving !== null || pending}
                title={
                  !allValid ? "Fill all required fields across every UOM card to enable submission." : ""
                }
                onClick={() => save("submit")}
              >
                {saving === "submit" ? "Submitting…" : "Submit & Next →"}
              </button>
            </>
          )}
          {item.submittedAt && navigation.next && (
            <a href={`/supplier/items/${navigation.next}`} className="btn-primary">
              Next item →
            </a>
          )}
          {!item.submittedAt && !navigation.next && (
            <span className="text-xs text-siteone-warm-gray">Last item in queue</span>
          )}
        </div>
      </div>
    </div>
  );
}

function IdField({ label, value, grow }: { label: string; value: string; grow?: boolean }) {
  return (
    <div className={grow ? "md:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold">
        {label}
      </div>
      <div className="text-sm text-siteone-gray mt-1 leading-snug">{value}</div>
    </div>
  );
}

function CalcChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

function UomCard({
  uom,
  issues,
  disabled,
  onPatch,
  onRemove,
}: {
  uom: UomState;
  issues: { field: string; message: string }[];
  disabled: boolean;
  onPatch: (p: Partial<UomState>) => void;
  onRemove: (() => void) | null;
}) {
  const isEach = uom.uomCode === "EA";
  const isPallet = uom.uomCode === "PL";
  const fieldErr = (k: string) => issues.find((i) => i.field === k)?.message;
  const hasIssues = issues.length > 0;

  return (
    <div className="flex-shrink-0 w-[420px] bg-white rounded-lg shadow flex flex-col">
      <div className="bg-siteone-gray text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-siteone-safety text-siteone-green font-mono font-bold text-xs px-2 py-1 rounded">
            {uom.uomCode}
          </span>
          <span className="font-semibold">{uom.uomName}</span>
          {uom.source === "ADDED" && (
            <span className="bg-siteone-blue text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Added
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              hasIssues ? "bg-[var(--red)]" : "bg-siteone-safety",
            )}
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="text-white/70 hover:text-white text-xs"
              title="Remove this added UOM"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* IDENTIFIERS */}
      <Section label="Identifiers" tint="bg-white">
        <Field label="UOM Quantity" required={!isEach} error={fieldErr("uomQuantity")}>
          <input
            type="number"
            step="any"
            value={uom.uomQuantity ?? ""}
            readOnly={isEach}
            disabled={disabled}
            onChange={(e) =>
              onPatch({ uomQuantity: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="input"
            placeholder={isEach ? "1" : "# eaches in this UOM"}
          />
          {!isEach && (
            <div className="text-[10px] text-siteone-green-gray mt-1">
              # of eaches in this UOM (used for cases-per-pallet calc)
            </div>
          )}
        </Field>
        <Field
          label="Barcode / GTIN"
          required={!uom.barcodeWaived}
          error={fieldErr("barcode")}
        >
          <input
            type="text"
            value={uom.barcode ?? ""}
            disabled={uom.barcodeWaived || disabled}
            onChange={(e) => onPatch({ barcode: e.target.value })}
            className="input"
            placeholder={uom.barcodeWaived ? "N/A" : "12-18 digit GTIN"}
          />
          <label className="flex items-center gap-2 mt-1 text-xs text-siteone-green-gray">
            <input
              type="checkbox"
              checked={uom.barcodeWaived}
              disabled={disabled}
              onChange={(e) =>
                onPatch({ barcodeWaived: e.target.checked, barcode: e.target.checked ? null : uom.barcode })
              }
            />
            No barcode for this UOM
          </label>
        </Field>
        <Field label="EDI UOM" required error={fieldErr("ediUom")}>
          <input
            type="text"
            value={uom.ediUom ?? ""}
            disabled={disabled}
            onChange={(e) => onPatch({ ediUom: e.target.value })}
            className="input"
            maxLength={4}
            placeholder={uom.defaultEdiUom}
          />
        </Field>
      </Section>

      {/* DIMENSIONS */}
      <Section label="Dimensions" tint="bg-[var(--green-light)]">
        <div className="grid grid-cols-2 gap-3">
          <DimField
            label="Length"
            value={uom.length}
            unit={uom.lengthUnit}
            disabled={disabled}
            onValue={(v) => onPatch({ length: v })}
            onUnit={(u) => onPatch({ lengthUnit: u })}
            error={fieldErr("length")}
          />
          <DimField
            label="Width"
            value={uom.width}
            unit={uom.widthUnit}
            disabled={disabled}
            onValue={(v) => onPatch({ width: v })}
            onUnit={(u) => onPatch({ widthUnit: u })}
            error={fieldErr("width")}
          />
          <DimField
            label="Height"
            value={uom.height}
            unit={uom.heightUnit}
            disabled={disabled}
            onValue={(v) => onPatch({ height: v })}
            onUnit={(u) => onPatch({ heightUnit: u })}
            error={fieldErr("height")}
          />
          <Field label="Weight (lbs)" required error={fieldErr("weight")}>
            <input
              type="number"
              step="any"
              value={uom.weight ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onPatch({ weight: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="input"
              placeholder="0.00"
            />
          </Field>
        </div>
      </Section>

      {/* LOGISTICS */}
      <Section label="Logistics" tint="bg-amber-50">
        <Field label="Freight Class">
          <div className="flex flex-wrap gap-1">
            {FREIGHT_CLASSES.map((fc) => (
              <button
                type="button"
                key={fc}
                disabled={disabled}
                onClick={() => onPatch({ freightClass: uom.freightClass === fc ? null : fc })}
                className={cn(
                  "px-2 py-1 text-xs rounded border",
                  uom.freightClass === fc
                    ? "bg-siteone-blue text-white border-siteone-blue"
                    : "bg-white text-siteone-gray border-[var(--border)] hover:border-siteone-blue",
                )}
              >
                {fc}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nestable" error={fieldErr("nestableIncrement")}>
          <YesNo
            value={uom.nestable}
            disabled={disabled}
            onChange={(v) =>
              onPatch({ nestable: v, nestableIncrement: v ? uom.nestableIncrement : null })
            }
          />
          {uom.nestable === true && (
            <input
              type="number"
              step="1"
              value={uom.nestableIncrement ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onPatch({
                  nestableIncrement: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="input mt-2"
              placeholder="Nestable increment"
            />
          )}
        </Field>
        <Field label="Lay Flat">
          <YesNo
            value={uom.layFlat}
            disabled={disabled}
            onChange={(v) => onPatch({ layFlat: v })}
          />
        </Field>
        {isPallet && (
          <>
            <Field label="Stackable">
              <YesNo
                value={uom.stackable}
                disabled={disabled}
                onChange={(v) => onPatch({ stackable: v })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TI (cases per layer)">
                <input
                  type="number"
                  value={uom.ti ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    onPatch({ ti: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="input"
                  placeholder="e.g. 10"
                />
              </Field>
              <Field label="HI (layers per pallet)">
                <input
                  type="number"
                  value={uom.hi ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    onPatch({ hi: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="input"
                  placeholder="e.g. 4"
                />
              </Field>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({
  label,
  tint,
  children,
}: {
  label: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("p-4 border-b border-[var(--border)] last:border-b-0", tint)}>
      <div className="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold mb-3">
        {label}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-siteone-gray mb-1">
        {label}
        {required && <span className="text-[var(--red)] ml-1">*</span>}
      </div>
      {children}
      {error && <div className="text-[11px] text-[var(--red)] mt-1">{error}</div>}
    </div>
  );
}

function DimField({
  label,
  value,
  unit,
  disabled,
  onValue,
  onUnit,
  error,
}: {
  label: string;
  value: number | null;
  unit: string;
  disabled: boolean;
  onValue: (v: number | null) => void;
  onUnit: (u: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} required error={error}>
      <div className="flex gap-1">
        <input
          type="number"
          step="any"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onValue(e.target.value === "" ? null : Number(e.target.value))}
          className="input flex-1"
          placeholder="0.00"
        />
        <select
          value={unit}
          disabled={disabled}
          onChange={(e) => onUnit(e.target.value)}
          className="input w-16"
        >
          <option value="IN">IN</option>
          <option value="FT">FT</option>
        </select>
      </div>
    </Field>
  );
}

function YesNo({
  value,
  disabled,
  onChange,
}: {
  value: boolean | null;
  disabled: boolean;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {(["yes", "no"] as const).map((option) => {
        const optVal = option === "yes";
        const active = value === optVal;
        return (
          <button
            type="button"
            key={option}
            disabled={disabled}
            onClick={() => onChange(active ? null : optVal)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded border",
              active && optVal
                ? "bg-siteone-green text-white border-siteone-green"
                : active && !optVal
                  ? "bg-[var(--red)] text-white border-[var(--red)]"
                  : "bg-white text-siteone-gray border-[var(--border)] hover:border-siteone-green",
            )}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function toUomLike(u: UomState): UomLike {
  return {
    uomCode: u.uomCode,
    uomQuantity: u.uomQuantity,
    barcode: u.barcode,
    barcodeWaived: u.barcodeWaived,
    ediUom: u.ediUom,
    length: u.length,
    lengthUnit: u.lengthUnit,
    width: u.width,
    widthUnit: u.widthUnit,
    height: u.height,
    heightUnit: u.heightUnit,
    weight: u.weight,
    nestable: u.nestable,
    nestableIncrement: u.nestableIncrement,
  };
}

function serializeUom(u: UomState) {
  return {
    uomCode: u.uomCode,
    source: u.source,
    uomQuantity: u.uomQuantity,
    barcode: u.barcodeWaived ? null : u.barcode,
    barcodeWaived: u.barcodeWaived,
    ediUom: u.ediUom,
    length: u.length,
    lengthUnit: u.lengthUnit,
    width: u.width,
    widthUnit: u.widthUnit,
    height: u.height,
    heightUnit: u.heightUnit,
    weight: u.weight,
    freightClass: u.freightClass,
    nestable: u.nestable,
    nestableIncrement: u.nestableIncrement,
    layFlat: u.layFlat,
    stackable: u.stackable,
    ti: u.ti,
    hi: u.hi,
  };
}
