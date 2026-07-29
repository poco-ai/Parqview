import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publishes cross-platform GitHub pre-releases from version tags", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /tags:\s*\n\s+- "v\*"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /tauri-apps\/tauri-action@v1/);
  assert.match(workflow, /prerelease: true/);
  assert.match(workflow, /generateReleaseNotes: true/);
  assert.match(workflow, /--bundles nsis,msi/);
  assert.match(workflow, /--bundles dmg/);
  assert.match(workflow, /--bundles deb,appimage/);
  assert.match(workflow, /APPLE_SIGNING_IDENTITY/);
});
