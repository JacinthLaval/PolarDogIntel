import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMcp } from '../src/context/McpContext';
import {
  savePat,
  loadPat,
  loadConfig,
  saveConfig,
  clearAll,
} from '../src/services/storage';
import { McpConfig, McpTransport } from '../src/types/mcp';
import { Colors, Typography, Spacing, Radius } from '../src/utils/theme';
import { Button, Card, SectionHeader, StatusDot } from '../src/components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { connectionState, connect, disconnect, client } = useMcp();

  const [pat, setPat] = useState('');
  const [config, setConfig] = useState<McpConfig>({
    serverUrl: '',
    transport: 'sse',
    accountIdentifier: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [patVisible, setPatVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedPat, savedConfig] = await Promise.all([
        loadPat(),
        loadConfig(),
      ]);
      if (savedPat) setPat(savedPat);
      setConfig(savedConfig);
    })();
  }, []);

  const handleSave = async () => {
    if (!pat.trim()) {
      Alert.alert('Missing PAT', 'Please enter your Snowflake Personal Access Token.');
      return;
    }
    if (!config.serverUrl.trim()) {
      Alert.alert('Missing Server URL', 'Please enter the MCP server URL.');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([savePat(pat.trim()), saveConfig(config)]);
      client?.setPat(pat.trim());
      client?.updateConfig(config);
      Alert.alert('Saved', 'Configuration saved. Tap Connect to test it.');
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
      if (connectionState.status === 'connected') {
        Alert.alert('Connected!', `Linked to ${connectionState.serverInfo?.name ?? 'Snowflake MCP'}`);
      }
    } catch (err) {
      Alert.alert('Connection Failed', String(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete your PAT and configuration. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            setPat('');
            disconnect();
          },
        },
      ]
    );
  };

  const isConnected = connectionState.status === 'connected';

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        {/* Connection status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <StatusDot status={connectionState.status as any} />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {isConnected
                  ? connectionState.serverInfo?.name ?? 'Connected'
                  : connectionState.status === 'error'
                  ? 'Connection Error'
                  : connectionState.status === 'connecting'
                  ? 'Connecting…'
                  : 'Disconnected'}
              </Text>
              {connectionState.error && (
                <Text style={styles.statusError}>{connectionState.error}</Text>
              )}
              {isConnected && connectionState.lastConnectedAt && (
                <Text style={styles.statusSub}>
                  {connectionState.serverInfo?.version &&
                    `v${connectionState.serverInfo.version} · `}
                  Connected
                </Text>
              )}
            </View>
            {isConnected ? (
              <Button
                label="Disconnect"
                onPress={handleDisconnect}
                variant="danger"
                style={styles.smallBtn}
              />
            ) : (
              <Button
                label="Connect"
                onPress={handleConnect}
                loading={isConnecting}
                variant="primary"
                style={styles.smallBtn}
              />
            )}
          </View>
        </Card>

        {/* PAT */}
        <SectionHeader title="Authentication" />
        <Card>
          <FieldLabel
            label="Personal Access Token"
            hint="Generated in Snowsight → Account → Personal Access Tokens"
          />
          <View style={styles.patRow}>
            <TextInput
              style={[styles.input, styles.patInput]}
              value={pat}
              onChangeText={setPat}
              placeholder="v2-…"
              placeholderTextColor={Colors.text2}
              secureTextEntry={!patVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text
              style={styles.toggle}
              onPress={() => setPatVisible((v) => !v)}
            >
              {patVisible ? '🙈' : '👁'}
            </Text>
          </View>
        </Card>

        {/* Server config */}
        <SectionHeader title="MCP Server" />
        <Card style={{ gap: Spacing.md }}>
          <View>
            <FieldLabel
              label="Snowflake Account"
              hint="e.g. xy12345.us-east-1"
            />
            <TextInput
              style={styles.input}
              value={config.accountIdentifier}
              onChangeText={(v) =>
                setConfig((c) => ({ ...c, accountIdentifier: v }))
              }
              placeholder="xy12345.us-east-1"
              placeholderTextColor={Colors.text2}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            <FieldLabel
              label="MCP Server URL"
              hint="The full endpoint URL for your managed MCP server"
            />
            <TextInput
              style={styles.input}
              value={config.serverUrl}
              onChangeText={(v) => setConfig((c) => ({ ...c, serverUrl: v }))}
              placeholder="https://xy12345.snowflakecomputing.com/api/v2/mcp/sse"
              placeholderTextColor={Colors.text2}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View>
            <FieldLabel
              label="Transport"
              hint="SSE for streaming, HTTP for polling"
            />
            <View style={styles.transportToggle}>
              {(['sse', 'http'] as McpTransport[]).map((t) => (
                <TransportOption
                  key={t}
                  label={t.toUpperCase()}
                  selected={config.transport === t}
                  onPress={() => setConfig((c) => ({ ...c, transport: t }))}
                />
              ))}
            </View>
          </View>
        </Card>

        {/* Actions */}
        <Button
          label="Save Configuration"
          onPress={handleSave}
          loading={isSaving}
          variant="primary"
        />

        <SectionHeader title="Danger Zone" />
        <Button
          label="Clear All Data & Sign Out"
          onPress={handleClearAll}
          variant="danger"
        />

        {/* Version */}
        <Text style={styles.version}>PolarDog Intel v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: Spacing.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function TransportOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      style={[styles.transportOpt, selected && styles.transportOptSelected]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg0 },
  inner: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  statusCard: { gap: 0 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: { flex: 1 },
  statusTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text0,
    textTransform: 'capitalize',
  },
  statusSub: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    marginTop: 2,
  },
  statusError: {
    fontSize: Typography.size.xs,
    color: Colors.error,
    marginTop: 2,
  },
  smallBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },

  fieldLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text0,
  },
  fieldHint: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    marginTop: 2,
  },

  input: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.sm,
    color: Colors.text0,
    fontSize: Typography.size.md,
    fontFamily: 'monospace',
  },
  patRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  patInput: {
    flex: 1,
    letterSpacing: 1,
  },
  toggle: {
    fontSize: 20,
    padding: Spacing.xs,
  },

  transportToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  transportOpt: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.bg3,
    color: Colors.text1,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    fontFamily: 'monospace',
  },
  transportOptSelected: {
    borderColor: Colors.accent,
    color: Colors.accent,
    backgroundColor: Colors.accentGlow,
  },

  version: {
    textAlign: 'center',
    fontSize: Typography.size.xs,
    color: Colors.text2,
    marginTop: Spacing.md,
  },
});
