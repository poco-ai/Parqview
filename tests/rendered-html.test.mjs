import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Parqview application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Parqview — 本地 Parquet 数据浏览器<\/title>/i);
  assert.match(html, /打开 Parquet 文件/);
  assert.match(html, /表格与 JSON/);
  assert.match(html, /数据仅在本机处理/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships local parquet parsing and both record views", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /parquetMetadataAsync/);
  assert.match(page, /parquetReadObjects/);
  assert.match(page, /hyparquet-compressors/);
  assert.match(page, /rowStart:/);
  assert.match(page, /rowEnd:/);
  assert.match(page, /view === "table"/);
  assert.match(page, /view === "json"/);
  assert.match(page, /type="file"/);
  assert.match(packageJson, /"hyparquet"/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
