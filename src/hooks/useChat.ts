import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ToolCall, ToolResult, McpTool } from '../types/mcp';
import { useMcp } from '../context/McpContext';

let _msgId = 1;
const newId = () => String(_msgId++);

/**
 * useChat — manages the conversation loop.
 *
 * Flow:
 *   1. User sends a message → stored as 'user' ChatMessage
 *   2. We call Anthropic API (via fetch) with full message history + MCP tools
 *   3. If Claude wants to call a tool, we execute it via the MCP client
 *   4. Tool result is fed back to Claude for a final answer
 *   5. Assistant reply stored as 'assistant' ChatMessage
 */
export function useChat() {
  const { callTool, tools } = useMcp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isThinking) return;

      setError(null);
      setIsThinking(true);

      // Store user message
      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      appendMessage(userMsg);

      // Build placeholder assistant message
      const assistantMsgId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolCalls: [],
        toolResults: [],
      };
      appendMessage(assistantMsg);

      abortRef.current = new AbortController();

      try {
        // Build Claude messages array from history
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Build tools definition for Claude from MCP tools
        const claudeTools = tools.map((t: McpTool) => ({
          name: t.name,
          description: t.description ?? '',
          input_schema: t.inputSchema,
        }));

        let responseContent = '';
        const pendingToolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        // ── Round 1: Ask Claude ─────────────────────────────────────────────
        const round1 = await callClaudeApi(
          history,
          claudeTools,
          abortRef.current.signal
        );

        for (const block of round1.content) {
          if (block.type === 'text') {
            responseContent += block.text ?? '';
          } else if (block.type === 'tool_use') {
            pendingToolCalls.push({
              id: block.id,
              toolName: block.name,
              arguments: block.input ?? {},
              status: 'pending',
            });
          }
        }

        // ── Round 2: Execute MCP tool calls ────────────────────────────────
        if (pendingToolCalls.length > 0) {
          updateMessage(assistantMsgId, { toolCalls: pendingToolCalls });

          for (const tc of pendingToolCalls) {
            try {
              const mcpResult = await callTool({
                name: tc.toolName,
                arguments: tc.arguments,
              });

              const result: ToolResult = {
                toolCallId: tc.id,
                content: mcpResult.content,
                isError: mcpResult.isError ?? false,
              };
              toolResults.push(result);

              // Mark tool call as done
              updateMessage(assistantMsgId, {
                toolCalls: pendingToolCalls.map((p) =>
                  p.id === tc.id
                    ? {
                        ...p,
                        status: mcpResult.isError ? 'error' : 'success',
                      }
                    : p
                ),
              });
            } catch (err) {
              toolResults.push({
                toolCallId: tc.id,
                content: [
                  {
                    type: 'text',
                    text: err instanceof Error ? err.message : String(err),
                  },
                ],
                isError: true,
              });
            }
          }

          // ── Round 3: Feed tool results back to Claude ───────────────────
          const toolResultMessages = [
            ...history,
            {
              role: 'assistant' as const,
              content: round1.content,
            },
            {
              role: 'user' as const,
              content: toolResults.map((tr) => ({
                type: 'tool_result',
                tool_use_id: tr.toolCallId,
                content: tr.content
                  .map((c) => c.text ?? '')
                  .join('\n')
                  .trim(),
                is_error: tr.isError,
              })),
            },
          ];

          const round2 = await callClaudeApi(
            toolResultMessages,
            claudeTools,
            abortRef.current.signal
          );

          for (const block of round2.content) {
            if (block.type === 'text') {
              responseContent += block.text ?? '';
            }
          }
        }

        updateMessage(assistantMsgId, {
          content: responseContent || '_(no response)_',
          toolCalls: pendingToolCalls,
          toolResults,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        updateMessage(assistantMsgId, {
          content: `Error: ${msg}`,
        });
      } finally {
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [messages, isThinking, tools, callTool, appendMessage, updateMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelCurrentRequest = useCallback(() => {
    abortRef.current?.abort();
    setIsThinking(false);
  }, []);

  return {
    messages,
    isThinking,
    error,
    sendMessage,
    clearMessages,
    cancelCurrentRequest,
  };
}

// ─── Claude API call ──────────────────────────────────────────────────────────

async function callClaudeApi(
  messages: Array<{ role: string; content: unknown }>,
  tools: unknown[],
  signal: AbortSignal
) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      // NOTE: In production, proxy requests through your own backend
      // so the Anthropic API key is never stored in the app binary.
      // Use EXPO_PUBLIC_ANTHROPIC_API_KEY only for local development.
      'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system:
        'You are PolarDog Intel, an intelligent data assistant connected to a Snowflake data platform via MCP. ' +
        'You have access to Snowflake tools that let you query databases, inspect schemas, and run analyses. ' +
        'Be concise, precise, and surface insights clearly. Format SQL and results as markdown tables when helpful.',
      messages,
      tools: tools.length > 0 ? tools : undefined,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  return res.json();
}
