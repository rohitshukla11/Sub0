# Amigo.ai

Your AI friend and companion — a personalized AI assistant that helps you plan your day, manage events, and save important moments as memories. Amigo stores memories on Arkiv DB and keeps all data user-controlled.

## What this project does
- Chat with Amigo for friendly help and suggestions
- Save conversations and insights as "memories" on Arkiv
- Browse, search, and delete memories
- Connect Google Calendar to view daily events
- See Arkiv entity and transaction links for created memories

## Tech overview
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Storage and on-chain entities: Arkiv DB (Mendoza testnet)
- Wallet: MetaMask (switches automatically to Arkiv Mendoza)
- AI: server route that calls an AI provider (OpenAI compatible)

## Run locally

Prerequisites:
- Node.js 18+
- npm
- MetaMask in your browser with an address you control

Steps:
1. Clone and install
```bash
git clone <repository-url>
cd amigo-ai
npm install
```
2. Configure environment
```bash
cp env.example .env.local
```
Edit `.env.local` with your Arkiv wallet/private key and RPC details:
```env
NEXT_PUBLIC_ARKIV_PRIVATE_KEY=your_arkiv_private_key
NEXT_PUBLIC_ARKIV_ADDRESS=your_arkiv_wallet
NEXT_PUBLIC_ARKIV_CHAIN_ID=60138453056
NEXT_PUBLIC_ARKIV_RPC_URL=https://mendoza.hoodi.arkiv.network/rpc
NEXT_PUBLIC_ARKIV_WS_URL=wss://mendoza.hoodi.arkiv.network/rpc/ws
NEXT_PUBLIC_ARKIV_EXPLORER_URL=https://explorer.mendoza.hoodi.arkiv.network
OPENAI_API_KEY=sk-...
```
3. Start the dev server
```bash
npm run dev
```
Open `http://localhost:3000`.

## How Arkiv is used here
- All memories are represented as Arkiv entities and stored via the Arkiv SDK.
- When the AI creates a memory, we persist it using the wallet client, returning:
  - `entityUrl` to the entity on the Arkiv explorer
  - `transactionUrl` for the write transaction
- The app lists your entities by owner and loads payloads; if a bulk query omits payloads, it fetches the entity individually.
- Deletion uses the entity key (`ipfsHash`) via the Arkiv wallet client and clears local cache.

Key Arkiv flows in code:
- `lib/golem-storage.ts`: search, retrieve, and delete Arkiv entities for memories
- `lib/metamask-wallet.ts`: switches MetaMask to Arkiv Mendoza network
- `app/api/personalized-agent/route.ts`: returns `entityUrl` and `transactionUrl` with AI replies
- `app/page.tsx`: wires UI actions to Arkiv-backed memory service

## Using the app
- Connect your wallet (MetaMask) and Google Calendar
- Chat with Amigo; when learning is enabled, memories are written to Arkiv
- Open the entity/transaction links from chat bubbles to verify on Arkiv
- Use the memory panel to search, refresh, and delete

## Configuration
- Arkiv (Mendoza): `60138453056`, RPC `https://mendoza.hoodi.arkiv.network/rpc`, WS `wss://mendoza.hoodi.arkiv.network/rpc/ws`
- Docs: `https://arkiv.network/getting-started/typescript`

## Contributing
1. Fork
2. Create a branch: `git checkout -b feat/x`
3. Commit: `git commit -m "feat: x"`
4. Push and open a PR

## License
MIT
