/**
 * McpClient — lightweight MCP client for React Native / Expo
 *
 * Supports two transports:
 *   • HTTP  — POST /mcp with JSON-RPC payloads (simplest, works everywhere)
 *   • SSE   — GET /mcp/sse for streaming + POST for sends (full duplex)
 *
 * Authentication: Snowflake PAT via Bearer token in Authorization header.
 */

import {
  McpConfig,
  McpInitializeParams,
  McpInitializeResult,
  McpListToolsResult,
  McpCallToolParams,
  McpCallToolResult,
  McpListResourcesResult,
  McpListPromptsResult,
  JsonRpcRequest,
  JsonRpcResponse,
  McpConnectionState,
  McpConnectionStatus,
} from '../types/mcp';

const MCP_PROTOCOL_VERSION = '2024-11-05';
const CLIENT_NAME = 'PolarDogIntel';
const CLIENT_VERSION = '1.0.0';

let _requestId = 1;
const nextId = () => _requestId++;

// ─── HTTP Transport ────────────────────────────────────────────────────────────

async function httpRequest<T>(
  url: string,
  pat: string,
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    params,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${pat}`,
      'X-Snowflake-Client': `${CLIENT_NAME}/${CLIENT_VERSION}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new McpClientError(
      `HTTP ${response.status}: ${response.statusText}. ${text}`,
      response.status
    );
  }

  const json: JsonRpcResponse<T> = await response.json();

  if (json.error) {
    throw new McpClientError(
      json.error.message,
      json.error.code,
      json.error.data
    );
  }

  if (json.result === undefined) {
    throw new McpClientError('Empty result from MCP server', -32603);
  }

  return json.result;
}

// ─── SSE Transport ─────────────────────────────────────────────────────────────
// React Native doesn't have native EventSource — we use a fetch-based streaming
// reader. For production, consider react-native-event-source or a polyfill.

type SseMessageHandler = (event: string, data: unknown) => void;

class SseConnection {
  private abortController: AbortController | null = null;
  private sessionUrl: string | null = null;
  private handlers: Map<string, SseMessageHandler[]> = new Map();

  constructor(
    private readonly baseUrl: string,
    private readonly pat: string
  ) {}

  async connect(onReady: (sessionUrl: string) => void): Promise<void> {
    this.abortController = new AbortController();

    const response = await fetch(this.baseUrl, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${this.pat}`,
        'Cache-Control': 'no-cache',
        'X-Snowflake-Client': `${CLIENT_NAME}/${CLIENT_VERSION}`,
      },
      signal: this.abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new McpClientError(
        `SSE connect failed: ${response.status}`,
        response.status
      );
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = 'message';
        let dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          } else if (line === '') {
            // Dispatch event
            if (dataLines.length > 0) {
              const dataStr = dataLines.join('\n');
              try {
                const parsed = JSON.parse(dataStr);

                if (eventType === 'endpoint') {
                  // Server sends its POST endpoint URL
                  this.sessionUrl = parsed.uri ?? dataStr;
                  onReady(this.sessionUrl!);
                } else {
                  this.emit(eventType, parsed);
                }
              } catch {
                this.emit(eventType, dataStr);
              }
            }
            eventType = 'message';
            dataLines = [];
          }
        }
      }
    };

    pump().catch(() => {
      /* handled by connection state */
    });
  }

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.sessionUrl ?? this.baseUrl;
    return httpRequest<T>(url, this.pat, method, params);
  }

  on(event: string, handler: SseMessageHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  private emit(event: string, data: unknown) {
    this.handlers.get(event)?.forEach((h) => h(event, data));
    this.handlers.get('*')?.forEach((h) => h(event, data));
  }

  disconnect() {
    this.abortController?.abort();
    this.abortController = null;
    this.sessionUrl = null;
  }
}

// ─── Error class ───────────────────────────────────────────────────────────────

export class McpClientError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'McpClientError';
  }
}

// ─── McpClient ─────────────────────────────────────────────────────────────────

export class McpClient {
  private pat: string = '';
  private config: McpConfig;
  private sseConnection: SseConnection | null = null;
  private initialized = false;
  private connectionState: McpConnectionState = {
    status: 'disconnected',
  };
  private stateListeners: Array<(state: McpConnectionState) => void> = [];

  constructor(config: McpConfig) {
    this.config = config;
  }

  // ── State management ──────────────────────────────────────────────────────

  getConnectionState(): McpConnectionState {
    return this.connectionState;
  }

  onStateChange(listener: (state: McpConnectionState) => void) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private setState(
    status: McpConnectionStatus,
    extra?: Partial<McpConnectionState>
  ) {
    this.connectionState = { status, ...extra };
    this.stateListeners.forEach((l) => l(this.connectionState));
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  setPat(pat: string) {
    this.pat = pat;
  }

  updateConfig(config: Partial<McpConfig>) {
    this.config = { ...this.config, ...config };
    this.disconnect();
  }

  // ── Connect / Disconnect ──────────────────────────────────────────────────

  async connect(): Promise<McpInitializeResult> {
    if (!this.pat) throw new McpClientError('No PAT configured');
    if (this.connectionState.status === 'connected') {
      return this.connectionState as unknown as McpInitializeResult;
    }

    this.setState('connecting');

    try {
      if (this.config.transport === 'sse') {
        await this._connectSse();
      }

      const result = await this._initialize();
      this.initialized = true;
      this.setState('connected', {
        serverInfo: result.serverInfo,
        capabilities: result.capabilities,
        lastConnectedAt: new Date(),
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setState('error', { error: message });
      throw err;
    }
  }

  private async _connectSse(): Promise<void> {
    this.sseConnection = new SseConnection(this.config.serverUrl, this.pat);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new McpClientError('SSE connection timeout')),
        15_000
      );
      this.sseConnection!.connect((sessionUrl) => {
        clearTimeout(timeout);
        resolve();
      }).catch(reject);
    });
  }

  private async _initialize(): Promise<McpInitializeResult> {
    const params: McpInitializeParams = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
      capabilities: {
        roots: { listChanged: false },
      },
    };

    const result = await this._rpc<McpInitializeResult>(
      'initialize',
      params as unknown as Record<string, unknown>
    );

    // Send initialized notification (no response expected)
    await this._rpc('notifications/initialized', {}).catch(() => {
      /* notifications may not be supported */
    });

    return result;
  }

  disconnect() {
    this.sseConnection?.disconnect();
    this.sseConnection = null;
    this.initialized = false;
    this.setState('disconnected');
  }

  // ── Core RPC ──────────────────────────────────────────────────────────────

  private async _rpc<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    if (this.config.transport === 'sse' && this.sseConnection) {
      return this.sseConnection.send<T>(method, params);
    }
    return httpRequest<T>(this.config.serverUrl, this.pat, method, params);
  }

  private _ensureConnected() {
    if (!this.initialized) {
      throw new McpClientError(
        'Not connected. Call connect() first.',
        -32000
      );
    }
  }

  // ── Tools ─────────────────────────────────────────────────────────────────

  async listTools(cursor?: string): Promise<McpListToolsResult> {
    this._ensureConnected();
    return this._rpc<McpListToolsResult>('tools/list', cursor ? { cursor } : {});
  }

  async callTool(params: McpCallToolParams): Promise<McpCallToolResult> {
    this._ensureConnected();
    return this._rpc<McpCallToolResult>('tools/call', {
      name: params.name,
      arguments: params.arguments ?? {},
    });
  }

  // ── Resources ─────────────────────────────────────────────────────────────

  async listResources(cursor?: string): Promise<McpListResourcesResult> {
    this._ensureConnected();
    return this._rpc<McpListResourcesResult>(
      'resources/list',
      cursor ? { cursor } : {}
    );
  }

  async readResource(uri: string) {
    this._ensureConnected();
    return this._rpc('resources/read', { uri });
  }

  // ── Prompts ───────────────────────────────────────────────────────────────

  async listPrompts(cursor?: string): Promise<McpListPromptsResult> {
    this._ensureConnected();
    return this._rpc<McpListPromptsResult>(
      'prompts/list',
      cursor ? { cursor } : {}
    );
  }

  async getPrompt(name: string, args?: Record<string, string>) {
    this._ensureConnected();
    return this._rpc('prompts/get', { name, arguments: args ?? {} });
  }
}
