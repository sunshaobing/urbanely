import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("login uses phone and password inputs and does not persist credentials", () => {
  const login = read("app/src/pages/LoginPage.tsx");
  const auth = read("app/src/auth.ts");

  assert.match(login, /autoComplete="tel"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(login, /onLogin/);

  assert.match(auth, /sessionStorage/);
  assert.match(auth, /localStorage/);
  assert.doesNotMatch(auth, /password/i);
});

