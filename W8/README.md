# W8 - ERC-721 & NFT Marketplace trên Hardhat

## Liên hệ với ảnh con khỉ trên OpenSea

NFT (ERC-721) không lưu ảnh trực tiếp trên blockchain mà lưu `tokenId → owner → tokenURI`.
`tokenURI` trỏ tới file JSON metadata trên IPFS (`name`, `description`, `image`, `attributes`), và trường `image` trỏ tới file ảnh con khỉ trên IPFS.
OpenSea cũng chính là một **NFT Marketplace** kết hợp hiển thị metadata từ IPFS và cho phép người bán đăng bán (`list`), người mua trả `ETH` để mua (`buy`).

## Cấu trúc 6 yêu cầu

| Yêu cầu | Thực hiện | File |
|---|---|---|
| 1. Deploy ERC-721 trên Hardhat | `MonkeyNFT` (OpenZeppelin ERC721 + URIStorage + Enumerable + Ownable) | `contracts/MonkeyNFT.sol`, `scripts/deploy.js` |
| 2. Mint NFT, ảnh + meta trên IPFS | Node IPFS (Helia) lưu ảnh + metadata JSON; mint với `tokenURI` từ IPFS | `scripts/ipfs-node.mjs`, `scripts/mint.js` |
| 3. MetaMask nối Hardhat, import NFT | Network `127.0.0.1:8545`, Chain ID `31337`; Import NFT (`0x8464...18bC`, ID `0`) | `web/app.js` |
| 4. Chuyển NFT sang địa chỉ khác | `transferFrom` từ Ví 1 sang Ví 2 | `scripts/transfer.js`, `web/app.js` |
| 5. Lặp 3-4 qua ứng dụng Web3 | Dapp tại `http://127.0.0.1:3000`: Connect, Mint, Import MetaMask, Transfer | `web/index.html`, `web/app.js` |
| 6. Tạo Market mua bán NFT bằng ETH | `NFTMarketplace`: `list(tokenId, price)`, `cancel(tokenId)`, `buy(tokenId)` trả ETH cho người bán và chuyển NFT cho người mua | `contracts/NFTMarketplace.sol`, `scripts/list.js`, `scripts/buy.js`, `web/app.js` |

## Các lệnh CLI (thư mục `W8`)

```powershell
npm test            # Chạy 5 bài test tự động (ERC-721 + Marketplace)
npm run node        # Chạy mạng Hardhat (cổng 8545)
npm run ipfs        # Chạy IPFS node & gateway (cổng 8080)
npm run deploy      # Deploy MonkeyNFT + NFTMarketplace
npm run mint        # Mint NFT mới cho Ví 1
npm run transfer    # Chuyển NFT từ Ví 1 sang Ví 2
npm run list        # Ví 1 đăng bán NFT #0 giá 5 ETH lên Marketplace
npm run buy         # Ví 2 trả 5 ETH mua NFT #0 từ Marketplace
npm run web         # Chạy ứng dụng Web3 tại http://127.0.0.1:3000
```
