const fs = require("fs");

const filePath = "D:/songsai-music-pc/components/vendor-scripts.tsx";
const text = fs.readFileSync(filePath, "utf8");

const startMarker = "      function buildAssetCard(item, index) {";
const endMarker = "      async function syncHeaderAuth() {";

const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  throw new Error("Could not locate assets UI block.");
}

const before = text.slice(0, start);
let block = text.slice(start, end);
const after = text.slice(end);

block = block.replace(/`/g, "\\`");
block = block.replace(/\$\{/g, "\\${");

fs.writeFileSync(filePath, before + block + after, "utf8");
