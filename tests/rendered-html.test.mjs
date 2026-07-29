import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds a self-contained desktop web entry", async () => {
  const html = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );

  assert.match(html, /<title>Parqview<\/title>/i);
  assert.match(html, /id="root"/);
  assert.match(html, /\.\/assets\/.+\.js/);
  assert.match(html, /\.\/assets\/.+\.css/);
  assert.doesNotMatch(html, /https?:\/\/(?!www\.w3\.org)/i);
});

test("ships local parquet parsing and all record views", async () => {
  const [source, packageSource] = await Promise.all([
    readFile(new URL("../frontend/Parqview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(source, /parquetMetadataAsync/);
  assert.match(source, /parquetReadObjects/);
  assert.match(source, /hyparquet-compressors/);
  assert.match(source, /view === "table"/);
  assert.match(source, /view === "direct"/);
  assert.match(source, /view === "json"/);
  assert.match(source, /<details/);
  assert.match(source, /safeJson\(activeRecords\[0\]\?\.row, 2\)/);
  assert.match(source, /SEARCH_BATCH_SIZE/);
  assert.match(source, /className="field-filter"/);
  assert.match(source, /<HighlightedText/);
  assert.match(source, /className="page-number-input"/);
  assert.match(source, /PREFERENCES_KEY/);
  assert.match(source, /data-color-mode/);
  assert.match(source, /utf8: false/);
  assert.match(source, /function sniffImageMime/);
  assert.match(source, /function findImageCandidate/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /className="json-image-previews"/);
  assert.match(source, /type="file"/);
  assert.match(packageSource, /"hyparquet"/);
  assert.match(packageSource, /"@tauri-apps\/cli"/);
  assert.doesNotMatch(packageSource, /"next"|"vinext"|"drizzle-orm"/);
});
