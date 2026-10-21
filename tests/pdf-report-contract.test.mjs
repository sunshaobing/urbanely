import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("PDF report headers and cache behavior stay on contract", () => {
  const contract = read("docs/03-api-contract.md");

  assert.match(contract, /现场勘测 PDF 的表头固定为 `现场勘测报告`/);
  assert.match(contract, /封堵完成 PDF 的表头固定为 `结构漏洞\(鼠洞\)封堵报告`/);
  assert.match(contract, /标题在页面水平居中/);
  assert.match(contract, /不再使用 `现场服务报告` 或 `现场服务管理报告`/);
  assert.match(contract, /每次请求都按当前模板重新生成 PDF/);
  assert.match(contract, /`Cache-Control: no-store`/);
  assert.match(contract, /不改变报告数据、签字、照片、下载地址或其它前后端交互/);
});

test("PDF photo layout keeps five columns and continuous captions", () => {
  const contract = read("docs/03-api-contract.md");

  assert.match(contract, /每行固定 5 张照片/);
  assert.match(contract, /最后一行按实际照片数量生成，只靠左排列/);
  assert.match(contract, /保持原始横竖比例并在框内居中/);
  assert.match(contract, /现场照片1`、`现场照片2`/);
  assert.match(contract, /分页后继续递增/);
  assert.match(contract, /续页顶部显示原照片区块标题并带 `（续）` 标识/);
  assert.match(contract, /直接衔接后续客户点评和签字区域/);
  assert.match(contract, /页眉页脚、致谢、客户点评、签字、导出接口和业务数据逻辑保持不变/);
});
