const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const OUT_DIR = path.join(__dirname, "../dist-site");

// 读取数据
const tags = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "tags.json"), "utf-8")).tags;
const platformsDir = path.join(DATA_DIR, "platforms");
const platforms = fs
  .readdirSync(platformsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(platformsDir, f), "utf-8")));

// 展开 benefits，附带 platform 信息
const allBenefits = [];
for (const p of platforms) {
  for (const b of p.benefits) {
    if (!b.active) continue;
    allBenefits.push({
      ...b,
      platform: p.platform,
      platform_id: p.platform_id,
    });
  }
}

const platformSummary = platforms.map((p) => ({
  platform: p.platform,
  platform_id: p.platform_id,
  levels: p.levels,
  benefit_count: p.benefits.filter((b) => b.active).length,
}));

// 读取 SKILL.md
let skillMd = '';
try {
  skillMd = fs.readFileSync(path.join(__dirname, "../clawhub/SKILL.md"), "utf-8");
} catch {}

// 读取 HTML 模板
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf-8");

// 注入数据
const injected = html.replace(
  "const API = '';",
  `const API = '';
const EMBEDDED_DATA = ${JSON.stringify({ tags, platforms: platformSummary, benefits: allBenefits, skillMd })};`
).replace(
  `fetch(\`\${API}/api/tags\`).then(r => r.json()),
    fetch(\`\${API}/api/platforms\`).then(r => r.json()),
    fetch(\`\${API}/api/benefits\`).then(r => r.json()),`,
  `Promise.resolve(EMBEDDED_DATA.tags),
    Promise.resolve(EMBEDDED_DATA.platforms),
    Promise.resolve(EMBEDDED_DATA.benefits),`
);

// 输出
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "index.html"), injected);

console.log(`✅ Static site built: ${OUT_DIR}/index.html`);
console.log(`   ${allBenefits.length} benefits from ${platforms.length} platforms`);
