import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.join(root, ".ipfs");
const outFile = path.join(root, "deployments", "ipfs.json");
const PORT = Number(process.env.IPFS_GATEWAY_PORT ?? 8080);

const [blockstore, datastore] = [new FsBlockstore(path.join(repo, "blocks")), new FsDatastore(path.join(repo, "data"))];
await Promise.all([blockstore.open(), datastore.open()]);
const helia = await createHelia({ blockstore, datastore });
const fs = unixfs(helia);

async function publish() {
  const image = await readFile(path.join(root, "assets", "monkey.jpg"));
  const imageCid = await fs.addBytes(image);

  const gateway = `http://127.0.0.1:${PORT}`;
  const metadata = {
    name: "Monkey #0",
    description: "ERC-721 monkey avatar stored on IPFS (UET Blockchain W8).",
    image: `${gateway}/ipfs/${imageCid}`,
    attributes: [
      { trait_type: "Species", value: "Monkey" },
      { trait_type: "Headwear", value: "Teal Beanie" },
      { trait_type: "Style", value: "Cartoon" },
    ],
  };
  const metadataCid = await fs.addBytes(new TextEncoder().encode(JSON.stringify(metadata, null, 2)));

  await mkdir(path.dirname(outFile), { recursive: true });
  const record = {
    imageCid: imageCid.toString(),
    metadataCid: metadataCid.toString(),
    tokenURI: `${gateway}/ipfs/${metadataCid}`,
    ipfsURI: `ipfs://${metadataCid}`,
    gateway,
  };
  await writeFile(outFile, JSON.stringify(record, null, 2));
  return record;
}

const contentType = (bytes) => (bytes[0] === 0x7b ? "application/json" : bytes[0] === 0xff ? "image/jpeg" : "application/octet-stream");

const server = createServer(async (req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  try {
    const cid = CID.parse(req.url.split("?")[0].replace(/^\/ipfs\//, ""));
    const chunks = [];
    for await (const chunk of fs.cat(cid, { offline: true })) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    res.writeHead(200, { ...cors, "Content-Type": contentType(body), "Cache-Control": "public, max-age=31536000, immutable" });
    res.end(body);
  } catch (err) {
    res.writeHead(404, cors).end(`CID not found locally: ${err.message}`);
  }
});

const record = await publish();
server.listen(PORT, "127.0.0.1", () => {
  console.log("IPFS pinned locally:");
  console.log(`  image    ipfs://${record.imageCid}`);
  console.log(`  metadata ${record.tokenURI}`);
  console.log(`Gateway: http://127.0.0.1:${PORT}/ipfs/<cid>`);
});

process.on("SIGINT", async () => {
  server.close();
  await helia.stop();
  process.exit(0);
});
