"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { Readable, Transform } = require("node:stream");
const { createHash, randomUUID } = require("node:crypto");

const root = __dirname;
const dir = path.join(root, "packs");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "pack-catalog.json"), "utf8"));
const codes = ["oh", "wv", "va", "pa", "nc"];
const verifyOnly = process.argv.includes("--verify-only");

async function matches(file, asset) {
  const info = fs.statSync(file, {throwIfNoEntry:false});
  if (!info?.isFile() || info.size !== asset.size) return false;
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex") === asset.sha;
}

async function main() {
  if (!verifyOnly) fs.mkdirSync(dir, {recursive:true});
  if (!/^[0-9]{4}-[0-9]{2}$/.test(catalog.release) || catalog.assets.length !== codes.length) {
    throw Error("Unexpected pack catalog");
  }
  const assets = codes.map(code => {
    const name = "us-" + code + ".pmtiles";
    const url = "https://github.com/actionstations-ai/maps/releases/download/" + catalog.release + "/" + name;
    const asset = catalog.assets.find(a => a.code === code);
    if (!asset || asset.name !== name || asset.url !== url ||
        !Number.isSafeInteger(asset.size) || asset.size <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha)) {
      throw Error("Invalid catalog entry for " + code);
    }
    return asset;
  });
  for (const asset of assets) {
    const dest = path.join(dir, asset.name);
    if (await matches(dest, asset)) {
      console.log(asset.name + " verified (" + asset.size + " bytes)");
      continue;
    }
    if (verifyOnly) throw Error(asset.name + " missing or checksum mismatch");
    const temp = dest + "." + randomUUID() + ".partial";
    try {
      const response = await fetch(asset.url, {signal:AbortSignal.timeout(1800000)});
      if (!response.ok || !response.body) throw Error(asset.name + " HTTP " + response.status);
      const hash = createHash("sha256");
      let size = 0;
      await pipeline(Readable.fromWeb(response.body), new Transform({
        transform(chunk, encoding, done) {
          size += chunk.length;
          if (size > asset.size) return done(Error(asset.name + " exceeds catalog size"));
          hash.update(chunk);
          done(null, chunk);
        }
      }), fs.createWriteStream(temp, {flags:"wx"}));
      if (size !== asset.size || hash.digest("hex") !== asset.sha) {
        throw Error(asset.name + " checksum mismatch");
      }
      fs.renameSync(temp, dest);
      console.log(asset.name + " downloaded and verified (" + size + " bytes)");
    } finally {
      fs.rmSync(temp, {force:true});
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
