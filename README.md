# 🐾 PolarDog Intel

> A React Native (Expo) iOS app — MCP client for Snowflake managed MCP servers.

PolarDog Intel connects to a Snowflake-hosted MCP server and exposes its tools to an on-device AI chat experience powered by Claude.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  PolarDog Intel (iOS)           │
│                                                 │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Chat    │  │  Tools     │  │  Data      │  │
│  │  Screen  │  │  Browser   │  │  Explorer  │  │
│  └────┬─────┘  └─────┬──────┘  └─────┬──────┘  │
│       │              │               │          │
│       └──────────────┼───────────────┘          │
│                      │                          │
│              ┌───────┴──────┐                   │
│              │  McpContext  │                   │
│              └───────┬──────┘                   │
│                      │                          │
│              ┌───────┴──────┐                   │
│              │  McpClient   │  PAT auth          │
│              └───────┬──────┘                   │
└──────────────────────┼──────────────────────────┘
                       │  SSE or HTTP transport
                       ▼
        ┌──────────────────────────────┐
        │  Snowflake Managed MCP       │
        │  Server                      │
        │  (Cortex, Warehouse, etc.)   │
        └──────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Xcode 15+ (for iOS builds)

### 1. Clone & install

```bash
git clone https://github.com/JacinthLaval/PolarDogIntel.git
cd PolarDogIntel
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_MCP_SERVER_URL=https://YOUR_ACCOUNT.snowflakecomputing.com/api/v2/mcp/sse
EXPO_PUBLIC_SNOWFLAKE_ACCOUNT=YOUR_ACCOUNT.REGION
EXPO_PUBLIC_MCP_TRANSPORT=sse
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...   # dev only — use a backend proxy in production
```

### 3. Run on iOS Simulator

```bash
npm run ios
```

### 4. Configure in-app

1. Tap **Settings** (gear icon in nav)
2. Paste your Snowflake **Personal Access Token**
3. Verify / update the **MCP Server URL**
4. Tap **Save** → **Connect**

---

## Snowflake MCP Setup

### Create a PAT in Snowflake

```sql
-- In Snowsight or SnowSQL:
ALTER USER <your_user> SET RSA_PUBLIC_KEY='<your_public_key>';
-- Or use the Snowsight UI: Account → Personal Access Tokens → Generate
```

### Enable the Managed MCP Server

```sql
-- Enable the Cortex-hosted MCP server (Snowflake managed)
ALTER ACCOUNT SET ENABLE_MCP_SERVER = TRUE;
```

The endpoint will be:
```
https://<account>.snowflakecomputing.com/api/v2/mcp/sse
```

---

## Project Structure

```
PolarDogIntel/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout + McpProvider
│   ├── settings.tsx        # Settings modal
│   └── (tabs)/
│       ├── _layout.tsx     # Tab bar
│       ├── index.tsx       # Chat screen
│       ├── tools.tsx       # MCP tools browser
│       └── explorer.tsx    # SQL data explorer
├── src/
│   ├── services/
│   │   ├── McpClient.ts    # MCP protocol implementation (SSE + HTTP)
│   │   └── storage.ts      # Secure PAT + config persistence
│   ├── context/
│   │   └── McpContext.tsx  # React context wrapping McpClient
│   ├── hooks/
│   │   └── useChat.ts      # Chat + tool call loop (Claude ↔ MCP)
│   ├── components/
│   │   └── ui.tsx          # Reusable UI components
│   ├── types/
│   │   └── mcp.ts          # MCP protocol TypeScript types
│   └── utils/
│       └── theme.ts        # Design tokens (Arctic command center theme)
├── .env.example
├── app.json
├── eas.json
└── tsconfig.json
```

---

## Production Notes

- **API Key Security**: The Anthropic API key should never be bundled in a production app binary. Set up a lightweight backend proxy (e.g. a Cloudflare Worker or AWS Lambda) that forwards requests to the Anthropic API, and point `EXPO_PUBLIC_ANTHROPIC_API_KEY` at your proxy instead.
- **PAT Storage**: PATs are stored via `expo-secure-store` (iOS Keychain) — encrypted at rest.
- **MCP Transport**: Use `sse` for real-time streaming results; use `http` if your Snowflake setup only exposes a stateless HTTP endpoint.

---

## License

MIT
