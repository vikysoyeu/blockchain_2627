const $ = (id) => document.getElementById(id);
const log = (msg) => ($("log").textContent = `${new Date().toLocaleTimeString()}  ${msg}\n${$("log").textContent}`);
const shortAddr = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

const state = { provider: null, signer: null, account: null, nft: null, market: null, config: null, ipfs: null };

const toGateway = (uri) => (uri?.startsWith("ipfs://") ? uri.replace("ipfs://", `${state.ipfs.gateway}/ipfs/`) : uri);

async function loadConfig() {
  const [config, ipfs] = await Promise.all([fetch("/contract.json"), fetch("/ipfs.json")].map((p) => p.then((r) => r.json())));
  Object.assign(state, { config, ipfs });
  $("contractInfo").textContent = `NFT: ${config.address} · Market: ${config.marketAddress} · chainId ${config.chainId}`;
  $("uriInfo").textContent = `tokenURI: ${ipfs.tokenURI}`;
}

async function ensureNetwork() {
  const chainId = `0x${state.config.chainId.toString(16)}`;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (err) {
    if (err.code !== 4902) throw err;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId, chainName: "Hardhat Local", rpcUrls: ["http://127.0.0.1:8545"], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }],
    });
  }
}

async function connect() {
  if (!window.ethereum) return log("Không tìm thấy MetaMask");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureNetwork();
  state.provider = new ethers.BrowserProvider(window.ethereum);
  state.signer = await state.provider.getSigner();
  state.account = await state.signer.getAddress();
  state.nft = new ethers.Contract(state.config.address, state.config.abi, state.signer);
  state.market = new ethers.Contract(state.config.marketAddress, state.config.marketAbi, state.signer);
  $("account").textContent = state.account;
  ["mint", "transfer", "refresh"].forEach((id) => ($(id).disabled = false));
  log(`Đã kết nối ${state.account}`);
  await render();
}

async function fetchMetadata(tokenId) {
  const uri = await state.nft.tokenURI(tokenId);
  const meta = await (await fetch(toGateway(uri))).json();
  return { ...meta, image: toGateway(meta.image) };
}

async function render() {
  const ethBal = await state.provider.getBalance(state.account);
  $("balance").textContent = `${Number(ethers.formatEther(ethBal)).toFixed(4)} ETH`;
  await Promise.all([renderOwned(), renderMarket()]);
}

async function renderOwned() {
  const gallery = $("gallery");
  gallery.innerHTML = "";
  const balance = Number(await state.nft.balanceOf(state.account));
  if (!balance) {
    gallery.innerHTML = '<span class="muted">Ví hiện chưa sở hữu NFT nào</span>';
    return;
  }

  for (let i = 0; i < balance; i++) {
    const tokenId = await state.nft.tokenOfOwnerByIndex(state.account, i);
    const [meta, listing] = await Promise.all([
      fetchMetadata(tokenId).catch(() => ({ name: "Monkey NFT", image: "", attributes: [] })),
      state.market.listings(tokenId),
    ]);
    const isListed = listing.price > 0n && listing.seller.toLowerCase() === state.account.toLowerCase();

    const card = document.createElement("div");
    card.className = "nft";
    card.innerHTML = `
      <img src="${meta.image}" alt="${meta.name}" />
      <h3>${meta.name} <span class="muted">#${tokenId}</span></h3>
      <div class="traits">${(meta.attributes ?? []).map((a) => `<span class="trait">${a.trait_type}: ${a.value}</span>`).join("")}</div>
      <button class="ghost btn-watch">Import vào MetaMask</button>
      ${
        isListed
          ? `<div class="price-tag">Đang bán: ${ethers.formatEther(listing.price)} ETH</div>
             <button class="warn btn-cancel">Huỷ đăng bán</button>`
          : `<div class="row">
               <input type="number" step="0.01" min="0.01" placeholder="Giá ETH (vd: 5)" class="price-input" />
               <button class="warn btn-list">Đăng bán</button>
             </div>`
      }`;

    card.querySelector(".btn-watch").onclick = () => watchAsset(tokenId);
    if (isListed) {
      card.querySelector(".btn-cancel").onclick = () => run("Huỷ bán", () => cancelListing(tokenId));
    } else {
      card.querySelector(".btn-list").onclick = () => {
        const val = card.querySelector(".price-input").value.trim();
        run("Đăng bán", () => listToken(tokenId, val));
      };
    }
    gallery.append(card);
  }
}

async function renderMarket() {
  const marketGallery = $("marketGallery");
  marketGallery.innerHTML = "";
  const total = Number(await state.nft.totalSupply());
  let count = 0;

  for (let i = 0; i < total; i++) {
    const tokenId = await state.nft.tokenByIndex(i);
    const [listing, owner] = await Promise.all([state.market.listings(tokenId), state.nft.ownerOf(tokenId)]);
    if (listing.price === 0n || listing.seller.toLowerCase() !== owner.toLowerCase()) continue;
    count++;

    const meta = await fetchMetadata(tokenId).catch(() => ({ name: "Monkey NFT", image: "", attributes: [] }));
    const isSeller = listing.seller.toLowerCase() === state.account.toLowerCase();
    const priceEth = ethers.formatEther(listing.price);

    const card = document.createElement("div");
    card.className = "nft";
    card.innerHTML = `
      <img src="${meta.image}" alt="${meta.name}" />
      <h3>${meta.name} <span class="muted">#${tokenId}</span></h3>
      <div class="muted">Người bán: ${shortAddr(listing.seller)}</div>
      <div class="price-tag">Giá: ${priceEth} ETH</div>
      <button class="${isSeller ? "ghost" : "warn"} btn-action">
        ${isSeller ? "Huỷ đăng bán (Của bạn)" : `Mua ngay (${priceEth} ETH)`}
      </button>`;

    card.querySelector(".btn-action").onclick = () =>
      isSeller ? run("Huỷ bán", () => cancelListing(tokenId)) : run("Mua NFT", () => buyToken(tokenId, listing.price));
    marketGallery.append(card);
  }

  if (!count) marketGallery.innerHTML = '<span class="muted">Chưa có NFT nào đang rao bán trên chợ</span>';
}

async function listToken(tokenId, priceEth) {
  if (!priceEth || Number(priceEth) <= 0) throw new Error("Nhập giá ETH hợp lệ (> 0)");
  const price = ethers.parseEther(priceEth);
  const approved = await state.nft.isApprovedForAll(state.account, state.config.marketAddress);
  if (!approved) {
    log("Đang cấp quyền (setApprovalForAll) cho Marketplace...");
    await (await state.nft.setApprovalForAll(state.config.marketAddress, true)).wait();
  }
  const tx = await state.market.list(tokenId, price);
  log(`Tx đăng bán ${tx.hash} đang chờ xác nhận...`);
  await tx.wait();
  log(`Đã đăng bán NFT #${tokenId} với giá ${priceEth} ETH`);
  await render();
}

async function cancelListing(tokenId) {
  const tx = await state.market.cancel(tokenId);
  await tx.wait();
  log(`Đã huỷ đăng bán NFT #${tokenId}`);
  await render();
}

async function buyToken(tokenId, price) {
  const tx = await state.market.buy(tokenId, { value: price });
  log(`Tx mua ${tx.hash} đang chờ xác nhận...`);
  await tx.wait();
  log(`Mua thành công NFT #${tokenId} với giá ${ethers.formatEther(price)} ETH!`);
  await render();
}

async function watchAsset(tokenId) {
  const ok = await window.ethereum.request({
    method: "wallet_watchAsset",
    params: { type: "ERC721", options: { address: state.config.address, tokenId: tokenId.toString() } },
  });
  log(ok ? `Đã import NFT #${tokenId} vào MetaMask` : "Người dùng từ chối import");
}

async function run(label, action) {
  try {
    log(`${label}...`);
    await action();
  } catch (err) {
    log(`Lỗi: ${err.shortMessage ?? err.message}`);
  }
}

$("connect").onclick = () => run("Kết nối", connect);
$("refresh").onclick = () => run("Tải lại", render);

$("mint").onclick = () =>
  run("Mint", async () => {
    const to = $("mintTo").value.trim() || state.account;
    const tx = await state.nft.mint(to, state.ipfs.tokenURI);
    log(`Tx ${tx.hash} đang chờ xác nhận`);
    await tx.wait();
    log("Mint thành công");
    await render();
  });

$("transfer").onclick = () =>
  run("Chuyển NFT", async () => {
    const tokenId = $("transferId").value;
    const to = $("transferTo").value.trim();
    if (tokenId === "" || !ethers.isAddress(to)) throw new Error("Token ID hoặc địa chỉ không hợp lệ");
    const tx = await state.nft.transferFrom(state.account, to, tokenId);
    log(`Tx ${tx.hash} đang chờ xác nhận`);
    await tx.wait();
    log(`Đã chuyển NFT #${tokenId} tới ${to}`);
    await render();
  });

window.ethereum?.on("accountsChanged", () => location.reload());
window.ethereum?.on("chainChanged", () => location.reload());

loadConfig().catch(() => log("Thiếu deployments/*.json - chạy deploy và ipfs trước"));
