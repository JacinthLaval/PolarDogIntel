import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChat } from '../../src/hooks/useChat';
import { useMcp } from '../../src/context/McpContext';
import { ChatMessage } from '../../src/types/mcp';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';
import { Button, Card, EmptyState } from '../../src/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function ChatScreen() {
  const router = useRouter();
  const { connectionState } = useMcp();
  const { messages, isThinking, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = React.useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const isDisconnected = connectionState.status !== 'connected';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Disconnected banner */}
      {isDisconnected && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.bannerText}>
            {connectionState.status === 'error'
              ? `⚠️ ${connectionState.error ?? 'Connection error'}`
              : '🔌 Not connected to Snowflake — tap to configure'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="🐾"
            title="PolarDog Intel"
            subtitle="Ask anything about your Snowflake data. I'll use MCP tools to query it for you."
          />
        }
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      {/* Thinking indicator */}
      {isThinking && (
        <View style={styles.thinking}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.thinkingText}>Thinking…</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your data…"
          placeholderTextColor={Colors.text2}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isThinking}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isThinking) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isThinking}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      {messages.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearMessages}>
          <Text style={styles.clearBtnText}>Clear conversation</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const hasTools = (message.toolCalls?.length ?? 0) > 0;

  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {/* Role label */}
      <Text style={styles.bubbleRole}>
        {isUser ? 'You' : '🐾 PolarDog'}
      </Text>

      {/* Tool call badges */}
      {hasTools && (
        <View style={styles.toolBadges}>
          {message.toolCalls!.map((tc) => (
            <View
              key={tc.id}
              style={[
                styles.toolBadge,
                tc.status === 'error' && styles.toolBadgeError,
                tc.status === 'success' && styles.toolBadgeSuccess,
              ]}
            >
              <Text style={styles.toolBadgeText}>
                {tc.status === 'pending' ? '⏳' : tc.status === 'success' ? '✓' : '✗'}{' '}
                {tc.toolName}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
        {message.content}
      </Text>

      {/* Timestamp */}
      <Text style={styles.bubbleTime}>
        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  banner: {
    backgroundColor: Colors.bg2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentDim,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  bannerText: {
    color: Colors.accent,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    maxWidth: '90%',
    gap: Spacing.xs,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.accentDim,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg1,
    borderColor: Colors.bg3,
  },
  bubbleRole: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: Typography.size.md,
    color: Colors.text0,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.accent,
  },
  bubbleTime: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    textAlign: 'right',
    marginTop: 2,
  },
  toolBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  toolBadge: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.bg3,
  },
  toolBadgeSuccess: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(46,204,140,0.08)',
  },
  toolBadgeError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(245,90,77,0.08)',
  },
  toolBadgeText: {
    fontSize: Typography.size.xs,
    color: Colors.text1,
    fontFamily: 'monospace',
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  thinkingText: {
    fontSize: Typography.size.sm,
    color: Colors.text1,
    fontStyle: 'italic',
  },
  errorBar: {
    backgroundColor: 'rgba(245,90,77,0.1)',
    borderTopWidth: 1,
    borderTopColor: Colors.error,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.size.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.bg3,
    backgroundColor: Colors.bg1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.sm,
    paddingTop: 12,
    color: Colors.text0,
    fontSize: Typography.size.md,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.bg3,
  },
  sendIcon: {
    color: Colors.bg0,
    fontSize: 20,
    fontWeight: Typography.weight.bold,
  },
  clearBtn: {
    alignItems: 'center',
    padding: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg1,
  },
  clearBtnText: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
  },
});
