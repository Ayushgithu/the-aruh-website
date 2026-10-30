// Generates the favicon, PWA icons and iOS splash screens from public/logo-mark.png (The Aaruh logo).
// Run:  npm run icons     (replace public/logo-mark.png first if the logo ever changes)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = "#FFFDFB";
mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });

// logo mark scaled to fit `box` px (keeps aspect ratio), returned as a PNG buffer
const mark = (box) => sharp("public/logo-mark.png").resize(box, box, { fit: "inside" }).png().toBuffer();

// square icon: cream background, logo centred with `pad` fraction of padding
const square = async (size, pad) => {
  const inner = Math.round(size * (1 - pad * 2));
  const m = await mark(inner);
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([{ input: m, gravity: "center" }]).png();
};

await (await square(192, 0.12)).toFile("public/icons/icon-192.png");
await (await square(512, 0.12)).toFile("public/icons/icon-512.png");
await (await square(180, 0.12)).toFile("public/icons/apple-touch-icon.png");
await (await square(512, 0.26)).toFile("public/icons/maskable-512.png"); // extra padding = safe zone for maskable icons

const fav = (await (await square(64, 0.08)).toBuffer()).toString("base64");
writeFileSync("src/app/icon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${fav}"/></svg>\n`);

const splash = async (w, h, name) => {
  // full logo (mark + wordmark + tagline) centred on the cream background
  const logo = await sharp("public/logo.png").resize(Math.round(w * 0.62)).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png().toFile(`public/splash/${name}.png`);
};
await splash(1170, 2532, "iphone-1170x2532");
await splash(1290, 2796, "iphone-1290x2796");
await splash(1125, 2436, "iphone-1125x2436");
await splash(1640, 2360, "ipad-1640x2360");
console.log("Icons generated for The Aaruh.");
