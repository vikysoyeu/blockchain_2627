# ERC-20 Token + Vault + Web DApp (Hardhat)

## Cấu trúc
- `contracts/MyToken.sol` – ERC-20 (MTK, supply 1,000,000)
- `contracts/TokenVault.sol` – gửi/rút MTK (cần `approve`)
- `scripts/deploy.js` – deploy, chia 1000 MTK cho 2 account đầu, ghi `frontend/config.js`
- `frontend/` – web chuyển token + vault (ethers v6)

## Demo
```bash
npm test                # kiểm thử contract
npm run node            # terminal 1: mạng Hardhat (chainId 31337) + 20 account
npm run deploy          # terminal 2: deploy
npm run web             # terminal 2 (hoặc 3): http://localhost:3000
```

MetaMask:
1. Import 2 private key từ terminal `npm run node` (Account #0 = deployer, #1, #2 đã có 1000 MTK).
2. Mở http://localhost:3000 → **Kết nối MetaMask** (tự thêm/chuyển mạng Hardhat Local).
3. Import token vào MetaMask: *Import tokens* → dán địa chỉ `MyToken` (in ra khi deploy).
4. Nhập địa chỉ account khác + số lượng → **Chuyển** → xác nhận. Đổi account trong MetaMask để thấy số dư nhận.
5. Vault: nhập số lượng → **Gửi vào Vault** (2 giao dịch: approve + deposit) → **Rút khỏi Vault**.

Nếu restart `npm run node`, MetaMask báo nonce lỗi: *Settings → Advanced → Clear activity tab data*, rồi deploy lại.

