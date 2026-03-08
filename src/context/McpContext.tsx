import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { McpClient } from '../services/McpClient';
import { loadConfig, loadPat } from '../services/storage';
import {
  McpConnectionState,
  McpTool,
  McpCallToolParams,
  McpCallToolResult,
} from '../types/mcp';

interface McpContextValue {
  client: McpClient | null;
  connectionState: McpConnectionState;
  tools: McpTool[];
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  callTool: (params: McpCallToolParams) => Promise<McpCallToolResult>;
  refreshTools: () => Promise<void>;
}

const McpContext = createContext<McpContextValue | null>(null);

export function McpProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<McpClient | null>(null);
  const [connectionState, setConnectionState] = useState<McpConnectionState>({
    status: 'disconnected',
  });
  const [tools, setTools] = useState<McpTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize client on mount
  useEffect(() => {
    (async () => {
      const config = await loadConfig();
      const client = new McpClient(config);
      clientRef.current = client;

      // Subscribe to state changes
      client.onStateChange((state) => {
        setConnectionState(state);
      });

      // Auto-connect if PAT is saved
      const pat = await loadPat();
      if (pat) {
        client.setPat(pat);
        connect();
      }
    })();

    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setIsLoading(true);
    try {
      await client.connect();
      await refreshTools();
    } catch (err) {
      // Error captured in connectionState
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setTools([]);
  }, []);

  const refreshTools = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const result = await client.listTools();
      setTools(result.tools);
    } catch {
      setTools([]);
    }
  }, []);

  const callTool = useCallback(
    async (params: McpCallToolParams): Promise<McpCallToolResult> => {
      const client = clientRef.current;
      if (!client) throw new Error('MCP client not initialized');
      return client.callTool(params);
    },
    []
  );

  return (
    <McpContext.Provider
      value={{
        client: clientRef.current,
        connectionState,
        tools,
        isLoading,
        connect,
        disconnect,
        callTool,
        refreshTools,
      }}
    >
      {children}
    </McpContext.Provider>
  );
}

export function useMcp(): McpContextValue {
  const ctx = useContext(McpContext);
  if (!ctx) throw new Error('useMcp must be used inside <McpProvider>');
  return ctx;
}
