# P2P Lending Protocol Subgraph

Subgraph Ponder yang mengindex data onchain dari P2P Lending Protocol yang berjalan di Mantle Sepolia network.

## 📊 Database Schema

### 1. Transaction Logs (`transaction_logs`)
Menyimpan semua transaksi BuyTokens dan SellTokens:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Text | Primary key: transaction_hash + log_index |
| `contractAddress` | Bytes | Token contract address |
| `user` | Bytes | User wallet address |
| `type` | Text | Transaction type: "BUY" \| "SELL" |
| `tokenAmount` | BigInt | Amount of tokens (with token decimals) |
| `usdtAmount` | BigInt | Amount of USDT (6 decimals) |
| `timestamp` | BigInt | Transaction timestamp |
| `blockNumber` | BigInt | Block number |
| `transactionHash` | Bytes | Transaction hash |
| `logIndex` | BigInt | Log index in transaction |

### 2. Product Onchain (`product_onchain`)
Informasi produk yang dibuat melalui FactoryP2P:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Text | Primary key: token contract address |
| `contractAddress` | Bytes | Token contract address |
| `name` | Text | Product/token name |
| `symbol` | Text | Product/token symbol |
| `maxSupply` | BigInt | Maximum supply limit |
| `totalSupply` | BigInt | Current total supply |
| `factoryAddress` | Bytes | Factory contract address |
| `createdAt` | BigInt | Creation timestamp |
| `createdAtBlock` | BigInt | Creation block number |
| `createdAtTransaction` | Bytes | Creation transaction hash |
| `holderCount` | BigInt | Number of unique holders |

### 3. Ownership (`ownership`)
Data kepemilikan token yang real-time:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Text | Primary key: contract_address + user_address |
| `contractAddress` | Bytes | Token contract address |
| `user` | Bytes | User wallet address |
| `balance` | BigInt | Token balance owned by user |
| `lastUpdated` | BigInt | Last update timestamp |
| `lastUpdatedBlock` | BigInt | Last update block number |
| `productId` | Text | Foreign key to product_onchain |

## 🚀 Setup & Installation

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Set environment variable for Mantle Sepolia RPC
export PONDER_RPC_URL_5003="https://sepolia.mantle.xyz"
```

### 2. Configuration

Update `ponder.config.ts` dengan contract addresses yang benar:

```typescript
export default createConfig({
  chains: {
    mantleSepolia: {
      id: 5003,
      rpc: process.env.PONDER_RPC_URL_5003,
    },
  },
  contracts: {
    FactoryP2P: {
      chain: "mantleSepolia",
      abi: FactoryP2PAbi,
      address: "0x33b3332c63fce47a3972d54f9d8b1856e4e31e40", // Ganti jika berbeda
      startBlock: 31314553, // Sesuaikan dengan deployment block
    },
    TokenP2P: {
      chain: "mantleSepolia",
      abi: TokenP2PAbi,
      address: factory({
        address: "0x33b3332c63fce47a3972d54f9d8b1856e4e31e40",
        event: contractDeployedEvent,
        parameter: "contractAddress",
      }),
      startBlock: 31314553,
    },
  },
});
```

### 3. Running the Subgraph

```bash
# Development mode dengan auto-reload
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Clear database dan re-index dari awal
npm run dev:reset
```

## 📋 Event Handling

### FactoryP2P Events

**ContractDeployed**
- Dipicu saat FactoryP2P membuat TokenP2P baru
- Membuat record di `product_onchain` table
- Parameters:
  - `contractId`: ID dari kontrak yang dibuat
  - `contractAddress`: Address dari TokenP2P contract
  - `maxSupply`: Maximum supply token

### TokenP2P Events

**BuyTokens**
- Dipicu saat user membeli token dengan USDT
- Membuat transaction log dengan type "BUY"
- Update ownership table (increase balance)
- Update total supply (increase)

**SellTokens**
- Dipicu saat user menjual token ke USDT
- Membuat transaction log dengan type "SELL"
- Update ownership table (decrease balance)
- Update total supply (decrease)
- Auto-delete ownership record jika balance = 0

## 📝 Query Examples

### Get All Products
```sql
SELECT * FROM product_onchain ORDER BY createdAt DESC;
```

### Get User Token Holdings
```sql
SELECT * FROM ownership
WHERE user = '0xUSER_ADDRESS'
ORDER BY balance DESC;
```

### Get Transaction History for a Token
```sql
SELECT * FROM transaction_logs
WHERE contractAddress = '0xTOKEN_ADDRESS'
ORDER BY timestamp DESC
LIMIT 100;
```

### Get Top Holders for a Token
```sql
SELECT * FROM ownership
WHERE contractAddress = '0xTOKEN_ADDRESS'
ORDER BY balance DESC
LIMIT 50;
```

### Get Daily Transaction Volume
```sql
SELECT
  DATE(FROM_UNIXTIME(timestamp/1000)) as date,
  type,
  COUNT(*) as transaction_count,
  SUM(usdtAmount) as total_usdt_volume,
  SUM(tokenAmount) as total_token_volume
FROM transaction_logs
GROUP BY DATE(FROM_UNIXTIME(timestamp/1000)), type
ORDER BY date DESC;
```

## 🔧 API Integration

Subgraph ini menyediakan data untuk backend API dengan 3 endpoint utama:

1. **GET /products** - Daftar semua produk
2. **GET /transactions** - Histori transaksi
3. **GET /holdings** - Data kepemilikan token

Data diupdate real-time saat transaksi onchain terjadi.

## 🐛 Troubleshooting

### Events Not Detected
1. **Check start block**: Turunkan ke beberapa block sebelum deployment
2. **Verify RPC**: Pastikan RPC URL valid dan rate limits tidak terlampaui
3. **Contract address**: Konfirmasi factory address benar

### Missing BuyTokens/SellTokens Events
1. **Verify ABI**: Pastikan event signature match dengan kontrak
2. **Check transaction hash**: Verifikasi di Mantle Sepolia explorer
3. **Debug mode**: Cek console logs saat `npm run dev`

### Database Issues
```bash
# Reset database
rm -rf .ponder/db

# Clear generated types
rm -rf .ponder/generated
```

## 📚 Contract Information

- **Network**: Mantle Sepolia (Chain ID: 5003)
- **Factory Contract**: `0x33b3332c63fce47a3972d54f9d8b1856e4e31e40`
- **Token Standard**: ERC20 dengan P2P lending features
- **Stablecoin**: USDT (6 decimals) untuk collateral

## 🔗 Useful Links

- [Mantle Sepolia Explorer](https://sepolia.mantlescan.xyz/)
- [Ponder Documentation](https://ponder.sh/)
- [Factory Contract ABI](./abis/FactoryP2P.ts)
- [Token Contract ABI](./abis/TokenP2P.ts)