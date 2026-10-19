import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("dist/build/mp-weixin/project.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.appid = "wx9469d5e631279f7b";
config.libVersion = "2.21.2";
config.setting = {
  ...config.setting,
  urlCheck: true,
};
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log("Finalized mp-weixin project config.");
