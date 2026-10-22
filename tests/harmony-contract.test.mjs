import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("HarmonyOS internal-test packaging config is complete", () => {
  const manifest = read("uniapp/src/manifest.json");
  const module = read("uniapp/harmony-configs/entry/src/main/module.json5");
  const app = read("uniapp/harmony-configs/AppScope/app.json5");
  const docs = read("docs/10-harmony-internal-release.md");
  const check = read("uniapp/scripts/check-harmony-env.ps1");
  const locationPackage = read("uniapp/uni_modules/uni-location-system/package.json");

  assert.match(manifest, /"app-harmony"/);
  assert.match(manifest, /"name"\s*:\s*"申汰封堵勘测系统"/);
  assert.match(manifest, /"bundleName"\s*:\s*"cn\.sunrgw\.pco"/);
  assert.match(manifest, /"deviceArchs"\s*:\s*\[\s*"arm64-v8a"\s*\]/);
  assert.match(app, /"bundleName"\s*:\s*"cn\.sunrgw\.pco"/);
  assert.match(app, /"versionName"\s*:\s*"3\.2\.0"/);
  assert.match(module, /ohos\.permission\.INTERNET/);
  assert.match(module, /ohos\.permission\.APPROXIMATELY_LOCATION/);
  assert.match(module, /ohos\.permission\.LOCATION/);
  assert.match(module, /ohos\.permission\.CAMERA/);
  assert.doesNotMatch(module, /ohos\.permission\.LOCATION_IN_BACKGROUND/);
  assert.doesNotMatch(module, /ohos\.permission\.MICROPHONE/);
  assert.match(docs, /企业内部测试或企业应用/);
  assert.match(docs, /DevEco Studio 5\.1\.0\.849/);
  assert.match(docs, /cn\.sunrgw\.pco/);
  assert.match(check, /devecostudio64\.exe/);
  assert.doesNotMatch(check, /deveco-studio64\.exe/);
  assert.match(check, /uni_modules__uni_location_system\.har/);
  assert.match(locationPackage, /"app-harmony"\s*:\s*"u"/);
  assert.ok(
    fs.statSync(new URL("../uniapp/harmony-configs/libs/uni_modules__uni_location_system.har", import.meta.url)).size > 0
  );
  assert.ok(fs.statSync(new URL("../uniapp/uni_modules/uni-location/LICENSE", import.meta.url)).size > 0);
  assert.ok(fs.statSync(new URL("../uniapp/uni_modules/uni-location-system/LICENSE", import.meta.url)).size > 0);
});
