import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("login uses the production API and does not persist passwords", () => {
  const login = read("app/src/pages/LoginPage.tsx");
  const api = read("app/src/api.ts");
  const auth = read("app/src/auth.ts");
  const permissions = read("app/src/pages/Permissions.tsx");

  assert.match(login, /autoComplete="username"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(login, /loginWithPassword/);
  assert.match(login, /onLogin/);

  assert.match(api, /https:\/\/sunrgw\.cn/);
  assert.match(api, /\/api\/auth\/login/);
  assert.match(api, /\/api\/personnel/);
  assert.match(api, /\/api\/auth\/change-password/);

  assert.match(auth, /sessionStorage/);
  assert.match(auth, /localStorage/);
  assert.match(auth, /token: string/);
  assert.doesNotMatch(auth, /password/i);

  assert.match(permissions, /createPersonnel/);
  assert.match(permissions, /updatePersonnel/);
  assert.match(permissions, /changeOwnPassword/);
  assert.doesNotMatch(permissions, /from "\.\.\/permissions"/);
});

