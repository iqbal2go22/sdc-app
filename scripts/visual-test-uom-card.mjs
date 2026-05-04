// Visual test for the UOM card layout.
// Renders all three cards (Each, Case, Pallet) in their parent grid, each
// with the real cascade and component structure, then asserts that every
// section row aligns horizontally across the cards (Identifiers, Dimensions,
// Logistics each at the same Y across all cards).

import { chromium } from "playwright";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { execSync } from "node:child_process";

const PORT = 4123;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = "scripts/visual-test-output";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

console.log("Compiling Tailwind...");
execSync(
  `npx @tailwindcss/cli -i src/app/globals.css -o ${OUT_DIR}/compiled.css`,
  { stdio: "inherit" }
);

const css = readFileSync(`${OUT_DIR}/compiled.css`, "utf8");

// Mimic the JSX rendering: 3 UOM cards (Each / Case / Pallet) with varying
// Identifiers content lengths to stress-test alignment.
const cardHtml = (badge, name, idsHtml, dimsHtml, logsHtml) => /* html */ `
<div class="grid grid-rows-subgrid row-span-4 bg-white rounded-lg shadow overflow-hidden uom-card">
  <div class="bg-siteone-gray text-white px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="bg-siteone-safety text-siteone-green font-mono font-bold text-xs px-2 py-1 rounded">${badge}</span>
      <span class="font-semibold">${name}</span>
    </div>
  </div>
  <div class="p-4 border-t bg-white flex flex-col uom-section ids">
    <div class="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold mb-3">Identifiers</div>
    ${idsHtml}
  </div>
  <div class="p-4 border-t bg-[var(--green-light)] flex flex-col uom-section dims">
    <div class="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold mb-3">Dimensions</div>
    ${dimsHtml}
  </div>
  <div class="p-4 border-t bg-amber-50 flex flex-col uom-section logs">
    <div class="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold mb-3">Logistics</div>
    ${logsHtml}
  </div>
</div>
`;

const dimsHtml = /* html */ `
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">Length<span class="text-[var(--red)] ml-1">*</span></div>
      <div class="flex gap-1">
        <input type="number" class="input flex-1 min-w-0" placeholder="0.00">
        <select class="input w-[56px] flex-shrink-0 px-1.5 text-xs"><option>IN</option><option>FT</option></select>
      </div>
    </div>
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">Width<span class="text-[var(--red)] ml-1">*</span></div>
      <div class="flex gap-1">
        <input type="number" class="input flex-1 min-w-0" placeholder="0.00">
        <select class="input w-[56px] flex-shrink-0 px-1.5 text-xs"><option>IN</option><option>FT</option></select>
      </div>
    </div>
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">Height<span class="text-[var(--red)] ml-1">*</span></div>
      <div class="flex gap-1">
        <input type="number" class="input flex-1 min-w-0" placeholder="0.00">
        <select class="input w-[56px] flex-shrink-0 px-1.5 text-xs"><option>IN</option><option>FT</option></select>
      </div>
    </div>
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">Weight (lbs)<span class="text-[var(--red)] ml-1">*</span></div>
      <input type="number" class="input" placeholder="0.00">
    </div>
  </div>
</div>
`;

const eachIds = /* html */ `
<div class="space-y-3">
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">UOM Quantity</div>
    <input type="number" value="1" readonly class="input">
    <div class="text-[10px] text-siteone-green-gray mt-1">Fixed at 1 for Each</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Barcode / GTIN<span class="text-[var(--red)] ml-1">*</span></div>
    <input type="text" class="input" placeholder="12-18 digit GTIN">
    <label class="flex items-center gap-2 mt-1 text-xs text-siteone-green-gray"><input type="checkbox"> No barcode for this UOM</label>
    <div class="text-[11px] text-[var(--red)] mt-1">Required (or check 'No barcode')</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">EDI UOM<span class="text-[var(--red)] ml-1">*</span></div>
    <input type="text" class="input" value="EA">
    <div class="text-[11px] text-[var(--red)] mt-1">1-4 alphanumeric characters</div>
  </div>
</div>
`;

const caseIds = /* html */ `
<div class="space-y-3">
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">UOM Quantity<span class="text-[var(--red)] ml-1">*</span></div>
    <input type="number" class="input" placeholder="# eaches in this UOM">
    <div class="text-[10px] text-siteone-green-gray mt-1"># of eaches in this UOM (used for cases-per-pallet calc)</div>
    <div class="text-[11px] text-[var(--red)] mt-1">Required (# eaches in this UOM)</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Barcode / GTIN<span class="text-[var(--red)] ml-1">*</span></div>
    <input type="text" class="input" placeholder="12-18 digit GTIN">
    <label class="flex items-center gap-2 mt-1 text-xs text-siteone-green-gray"><input type="checkbox"> No barcode for this UOM</label>
    <div class="text-[11px] text-[var(--red)] mt-1">Required (or check 'No barcode')</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">EDI UOM<span class="text-[var(--red)] ml-1">*</span></div>
    <input type="text" class="input" value="CS">
    <div class="text-[11px] text-[var(--red)] mt-1">1-4 alphanumeric characters</div>
  </div>
</div>
`;

const palletIds = caseIds.replace("CS", "PL");

const eachLogs = /* html */ `
<div class="space-y-3">
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Freight Class</div>
    <div class="flex flex-wrap gap-1">${["50","55","60","65","70","77.5","85","92.5","100","110","125","150","175","200","250","300","400","500"].map(fc=>`<button class="px-2 py-1 text-xs rounded border bg-white text-siteone-gray border-[var(--border)]">${fc}</button>`).join("")}</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Nestable</div>
    <div class="flex gap-1"><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">Y</button><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">N</button></div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Lay Flat</div>
    <div class="flex gap-1"><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">Y</button><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">N</button></div>
  </div>
</div>
`;

const palletLogs = /* html */ `
<div class="space-y-3">
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Freight Class</div>
    <div class="flex flex-wrap gap-1">${["50","55","60","65","70","77.5","85","92.5","100","110","125","150","175","200","250","300","400","500"].map(fc=>`<button class="px-2 py-1 text-xs rounded border bg-white text-siteone-gray border-[var(--border)]">${fc}</button>`).join("")}</div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Nestable</div>
    <div class="flex gap-1"><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">Y</button><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">N</button></div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Lay Flat</div>
    <div class="flex gap-1"><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">Y</button><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">N</button></div>
  </div>
  <div>
    <div class="text-xs font-medium text-siteone-gray mb-1">Stackable</div>
    <div class="flex gap-1"><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">Y</button><button class="flex-1 py-1.5 text-xs font-semibold rounded border bg-white">N</button></div>
  </div>
  <div class="grid grid-cols-2 gap-3">
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">TI</div>
      <input type="number" class="input" placeholder="e.g. 10">
    </div>
    <div>
      <div class="text-xs font-medium text-siteone-gray mb-1">HI</div>
      <input type="number" class="input" placeholder="e.g. 4">
    </div>
  </div>
</div>
`;

const html = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>UOM cards alignment test</title>
<style>${css}</style>
</head><body>
<div class="p-8" style="background: #f4f3f0;">
  <div class="grid grid-flow-col auto-cols-[460px] grid-rows-[auto_auto_auto_auto] gap-x-4 gap-y-0 overflow-x-auto pb-2 cards-container">
    ${cardHtml("EA", "Each", eachIds, dimsHtml, eachLogs)}
    ${cardHtml("CS", "Case", caseIds, dimsHtml, eachLogs)}
    ${cardHtml("PL", "Pallet", palletIds, dimsHtml, palletLogs)}
    <button class="row-span-4 self-stretch w-44 border-2 border-dashed border-siteone-warm-gray rounded-lg flex flex-col items-center justify-center text-siteone-warm-gray">
      <span class="text-5xl font-light">+</span>
      <span class="text-sm mt-2 font-medium">Add UOM</span>
    </button>
  </div>
</div>
</body></html>
`;

writeFileSync(`${OUT_DIR}/page.html`, html);

const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(html);
});
await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  const sectionRects = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".uom-card"));
    return cards.map((card) => {
      const ids = card.querySelector(".uom-section.ids");
      const dims = card.querySelector(".uom-section.dims");
      const logs = card.querySelector(".uom-section.logs");
      const r = (el) => el.getBoundingClientRect();
      return {
        idsTop: r(ids).top,
        dimsTop: r(dims).top,
        logsTop: r(logs).top,
        cardHeight: r(card).height,
      };
    });
  });

  console.log("\nSection top-Y per card:");
  ["EA", "CS", "PL"].forEach((name, i) => {
    const r = sectionRects[i];
    console.log(`  ${name}: ids=${r.idsTop.toFixed(0)}  dims=${r.dimsTop.toFixed(0)}  logs=${r.logsTop.toFixed(0)}  h=${r.cardHeight.toFixed(0)}`);
  });

  const idsAligned = sectionRects.every(r => Math.abs(r.idsTop - sectionRects[0].idsTop) < 0.5);
  const dimsAligned = sectionRects.every(r => Math.abs(r.dimsTop - sectionRects[0].dimsTop) < 0.5);
  const logsAligned = sectionRects.every(r => Math.abs(r.logsTop - sectionRects[0].logsTop) < 0.5);

  console.log(`\nIdentifiers row aligned: ${idsAligned ? "✅" : "❌"}`);
  console.log(`Dimensions row aligned : ${dimsAligned ? "✅" : "❌"}`);
  console.log(`Logistics row aligned  : ${logsAligned ? "✅" : "❌"}`);

  await page.screenshot({ path: `${OUT_DIR}/uom-cards-row.png`, fullPage: true });
  console.log(`\nScreenshot: ${OUT_DIR}/uom-cards-row.png`);

  if (!idsAligned || !dimsAligned || !logsAligned) {
    process.exit(1);
  }
} finally {
  await browser.close();
  server.close();
}
