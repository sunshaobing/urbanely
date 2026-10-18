import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("AGENTS.md requires a commit and relevant tests for every change", () => {
  const text = fs.readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");

  assert.match(text, /每次改动完成后[\s\S]*Git commit/);
  assert.match(text, /每次改动后[\s\S]*相关测试/);
  assert.match(text, /所有测试和验证全部通过/);
  assert.match(text, /Definition of done/);
});
