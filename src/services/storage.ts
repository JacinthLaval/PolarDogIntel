/**
 * SecureStorage — wraps expo-secure-store for PAT + config persistence.
 * Sensitive values (PAT) stored encrypted. Config stored in AsyncStorage.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { McpConfig, McpTransport } from '../types/mcp';

const KEYS = {
  PAT: 'snowflake_pat',
  CONFIG: 'mcp_config',
} as const;

// ─── PAT ──────────────────────────────────────────────────────────────────────

export async function savePat(pat: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.PAT, pat);
}

export async function loadPat(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.PAT);
}

export async function deletePat(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.PAT);
}

// ─── MCP Config ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: McpConfig = {
  serverUrl:
    process.env.EXPO_PUBLIC_MCP_SERVER_URL ??
    'https://YOUR_ACCOUNT.snowflakecomputing.com/api/v2/mcp/sse',
  transport: (process.env.EXPO_PUBLIC_MCP_TRANSPORT as McpTransport) ?? 'sse',
  accountIdentifier:
    process.env.EXPO_PUBLIC_SNOWFLAKE_ACCOUNT ?? 'YOUR_ACCOUNT.REGION',
};

export async function saveConfig(config: McpConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}

export async function loadConfig(): Promise<McpConfig> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONFIG);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_CONFIG;
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.PAT),
    AsyncStorage.removeItem(KEYS.CONFIG),
  ]);
}
