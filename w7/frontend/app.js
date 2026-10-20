const { BrowserProvider, Contract, parseUnits, formatUnits, isAddress } = ethers;
const $ = (id) => document.getElementById(id);
const CHAIN_ID = "0x7a69";

let signer, token, vault, account;

const setStatus = (msg) => ($("status").textContent = msg);

async function ensureNetwork() {
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
  } catch (e) {
    if (e.code !== 4902) throw e;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_ID,
        chainName: "Hardhat Local",
        rpcUrls: ["http://127.0.0.1:8545"],
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      }],
    });
  }
}

async function connect() {
  if (!window.ethereum) return setStatus("Chưa cài MetaMask");
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureNetwork();
    const provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    token = new Contract(CONFIG.token.address, CONFIG.token.abi, signer);
    vault = new Contract(CONFIG.vault.address, CONFIG.vault.abi, signer);
    $("account").textContent = account;
    $("info").hidden = $("actions").hidden = false;
    $("connect").textContent = "Đã kết nối";
    await refresh();
    setStatus("");
  } catch (e) {
    setStatus(e.shortMessage || e.message);
  }
}

async function refresh() {
  const [bal, vbal] = await Promise.all([token.balanceOf(account), vault.balances(account)]);
  $("balance").textContent = formatUnits(bal, 18);
  $("vaultBalance").textContent = formatUnits(vbal, 18);
}

async function run(button, label, fn) {
  button.disabled = true;
  try {
    setStatus(`${label}: chờ xác nhận...`);
    await fn();
    setStatus(`${label}: thành công`);
    await refresh();
  } catch (e) {
    setStatus(e.shortMessage || e.reason || e.message);
  } finally {
    button.disabled = false;
  }
}

function readAmount(id) {
  const v = $(id).value;
  if (!v || Number(v) <= 0) throw new Error("Số lượng không hợp lệ");
  return parseUnits(v, 18);
}

$("connect").onclick = connect;

$("send").onclick = (ev) =>
  run(ev.target, "Chuyển token", async () => {
    const to = $("to").value.trim();
    if (!isAddress(to)) throw new Error("Địa chỉ không hợp lệ");
    await (await token.transfer(to, readAmount("amount"))).wait();
  });

$("deposit").onclick = (ev) =>
  run(ev.target, "Gửi Vault", async () => {
    const amount = readAmount("vaultAmount");
    await (await token.approve(CONFIG.vault.address, amount)).wait();
    await (await vault.deposit(amount)).wait();
  });

$("withdraw").onclick = (ev) =>
  run(ev.target, "Rút Vault", async () => {
    await (await vault.withdraw(readAmount("vaultAmount"))).wait();
  });

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

