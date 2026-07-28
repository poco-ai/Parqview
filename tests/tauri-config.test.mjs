import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("configures a cross-platform Tauri 2 desktop host", async () => {
  const [configSource, cargo, packageSource, viteSource] = await Promise.all([
    readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);
  const config = JSON.parse(configSource);
  const packageJson = JSON.parse(packageSource);

  assert.equal(config.$schema, "https://schema.tauri.app/config/2");
  assert.equal(config.build.frontendDist, "../dist");
  assert.equal(config.app.windows[0].dragDropEnabled, false);
  assert.equal(config.bundle.active, true);
  assert.equal(config.bundle.targets, "all");
  assert.match(config.bundle.copyright, /Parqview contributors/);
  await Promise.all(
    config.bundle.icon.map((icon) =>
      access(new URL(`../src-tauri/${icon}`, import.meta.url)),
    ),
  );
  assert.match(config.app.security.csp["script-src"], /wasm-unsafe-eval/);
  assert.match(cargo, /license = "MIT"/);
  assert.match(cargo, /tauri = \{ version = "2\./);
  assert.match(cargo, /tauri-build = \{ version = "2\./);
  assert.equal(packageJson.scripts["tauri:dev"], "tauri dev");
  assert.equal(packageJson.scripts["tauri:build"], "tauri build");
  assert.match(packageJson.devDependencies["@tauri-apps/cli"], /^(\^|~)?2\./);
  assert.match(viteSource, /port: 1420/);
  assert.match(viteSource, /root: "frontend"/);
  assert.match(viteSource, /src-tauri/);
});
