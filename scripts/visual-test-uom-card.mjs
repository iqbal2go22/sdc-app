// Visual test for the UOM card dimensions layout.
// Builds a standalone HTML that imports the same Tailwind + globals.css cascade,
// recreates the exact JSX structure of one UOM card's Dimensions section,
// then takes a screenshot and reports the computed widths so we can verify
// the .input class doesn't beat Tailwind's w-[56px] on the unit selector.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdirSync, existsSync } from "node:fs";

const PORT = 4123;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = "scripts/visual-test-output";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Spawn a tiny static server that serves an HTML page using globals.css via Tailwind.
// Easiest way: create a minimal Next page-equivalent using Tailwind's CLI compile,
// but for a one-shot test we skip Next entirely and use a vanilla HTML doc that
// references a built CSS bundle.
//
// Simplest approach: use Tailwind's standalone CLI to compile the project's globals.css
// to a file, then serve it via a tiny Node server.

import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";

console.log("Compiling Tailwind...");
const { execSync } = await import("node:child_process");
execSync(
  `npx @tailwindcss/cli -i src/app/globals.css -o ${OUT_DIR}/compiled.css`,
  { stdio: "inherit" }
);

const css = readFileSync(`${OUT_DIR}/compiled.css`, "utf8");

const html = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>UOM card test</title>
<style>${css}</style>
</head>
<body class="min-h-full">
<div class="p-8 bg-off-white">
  <!-- Mimic UOM card at 460px width -->
  <div class="flex-shrink-0 w-[460px] bg-white rounded-lg shadow flex flex-col mx-auto">
    <div class="bg-siteone-gray text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="bg-siteone-safety text-siteone-green font-mono font-bold text-xs px-2 py-1 rounded">EA</span>
        <span class="font-semibold">Each</span>
      </div>
    </div>

    <!-- Dimensions section -->
    <div class="p-4 border-b border-[var(--border)] bg-[var(--green-light)]">
      <div class="text-[10px] uppercase tracking-wider text-siteone-green-gray font-semibold mb-3">
        Dimensions
      </div>
      <div class="grid grid-cols-2 gap-3" id="dim-grid">
        <!-- Length -->
        <div>
          <div class="text-xs font-medium text-siteone-gray mb-1">Length<span class="text-[var(--red)] ml-1">*</span></div>
          <div class="flex gap-1">
            <input id="length-input" type="number" placeholder="0.00" class="input flex-1 min-w-0">
            <select id="length-unit" class="input w-[56px] flex-shrink-0 px-1.5 text-xs">
              <option>IN</option><option>FT</option>
            </select>
          </div>
        </div>
        <!-- Width -->
        <div>
          <div class="text-xs font-medium text-siteone-gray mb-1">Width<span class="text-[var(--red)] ml-1">*</span></div>
          <div class="flex gap-1">
            <input type="number" placeholder="0.00" class="input flex-1 min-w-0">
            <select class="input w-[56px] flex-shrink-0 px-1.5 text-xs">
              <option>IN</option><option>FT</option>
            </select>
          </div>
        </div>
        <!-- Height -->
        <div>
          <div class="text-xs font-medium text-siteone-gray mb-1">Height<span class="text-[var(--red)] ml-1">*</span></div>
          <div class="flex gap-1">
            <input type="number" placeholder="0.00" class="input flex-1 min-w-0">
            <select class="input w-[56px] flex-shrink-0 px-1.5 text-xs">
              <option>IN</option><option>FT</option>
            </select>
          </div>
        </div>
        <!-- Weight -->
        <div>
          <div class="text-xs font-medium text-siteone-gray mb-1">Weight (lbs)<span class="text-[var(--red)] ml-1">*</span></div>
          <input type="number" placeholder="0.00" class="input">
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
`;

writeFileSync(`${OUT_DIR}/page.html`, html);

const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(html);
});
await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Server up at ${BASE}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  const widths = await page.evaluate(() => {
    const lengthInput = document.getElementById("length-input");
    const lengthUnit = document.getElementById("length-unit");
    return {
      input: lengthInput.getBoundingClientRect().width,
      unit: lengthUnit.getBoundingClientRect().width,
    };
  });
  console.log("\nComputed widths:");
  console.log("  Length input :", widths.input.toFixed(1), "px");
  console.log("  Length select:", widths.unit.toFixed(1), "px");
  console.log(
    widths.input > widths.unit * 1.5
      ? "\n✅ Input is meaningfully wider than select."
      : "\n❌ Input not wide enough — select is dominating."
  );

  await page.screenshot({ path: `${OUT_DIR}/uom-card.png`, fullPage: true });
  console.log(`\nScreenshot saved to ${OUT_DIR}/uom-card.png`);
} finally {
  await browser.close();
  server.close();
}
