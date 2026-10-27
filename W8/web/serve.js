const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const routes = {
  "/": path.join(__dirname, "index.html"),
  "/app.js": path.join(__dirname, "app.js"),
  "/ethers.js": path.join(root, "node_modules", "ethers", "dist", "ethers.umd.min.js"),
  "/contract.json": path.join(root, "deployments", "contract.json"),
  "/ipfs.json": path.join(root, "deployments", "ipfs.json"),
};
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };

http
  .createServer((req, res) => {
    const file = routes[req.url.split("?")[0]];
    if (!file || !fs.existsSync(file)) return res.writeHead(404).end("Not found");
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "text/plain", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(3000, "127.0.0.1", () => console.log("Web3 app: http://127.0.0.1:3000"));

