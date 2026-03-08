import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useMcp } from '../../src/context/McpContext';
import { McpTool } from '../../src/types/mcp';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
} from '../../src/utils/theme';
import {
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Chip,
} from '../../src/components/ui';

export default function ToolsScreen() {
  const { tools, connectionState, refreshTools, isLoading } = useMcp();
  const [selected, setSelected] = useState<McpTool | null>(null);

  const isConnected = connectionState.status === 'connected';

  return (
    <View style={styles.container}>
      <FlatList
        data={tools}
        keyExtractor={(t) => t.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <SectionHeader
              title={`${tools.length} tool${tools.length !== 1 ? 's' : ''} available`}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🔧"
            title={isConnected ? 'No tools found' : 'Not connected'}
            subtitle={
              isConnected
                ? 'The MCP server did not expose any tools.'
                : 'Connect to your Snowflake MCP server in Settings to see available tools.'
            }
          />
        }
        renderItem={({ item }) => (
          <ToolCard tool={item} onPress={() => setSelected(item)} />
        )}
        refreshing={isLoading}
        onRefresh={refreshTools}
      />

      {selected && (
        <ToolDetailModal tool={selected} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

function ToolCard({
  tool,
  onPress,
}: {
  tool: McpTool;
  onPress: () => void;
}) {
  const paramCount = Object.keys(tool.inputSchema.properties ?? {}).length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.toolCard} accent>
        <View style={styles.toolHeader}>
          <Text style={styles.toolName}>{tool.name}</Text>
          <Chip label={`${paramCount} param${paramCount !== 1 ? 's' : ''}`} />
        </View>
        {tool.description ? (
          <Text style={styles.toolDesc} numberOfLines={2}>
            {tool.description}
          </Text>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

function ToolDetailModal({
  tool,
  onClose,
}: {
  tool: McpTool;
  onClose: () => void;
}) {
  const props = tool.inputSchema.properties ?? {};
  const required = tool.inputSchema.required ?? [];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{tool.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {tool.description && (
            <Text style={styles.modalDesc}>{tool.description}</Text>
          )}

          <SectionHeader title="Parameters" />

          {Object.entries(props).length === 0 ? (
            <Text style={styles.noParams}>No parameters required.</Text>
          ) : (
            Object.entries(props).map(([name, schema]) => (
              <ParamRow
                key={name}
                name={name}
                schema={schema as Record<string, unknown>}
                required={required.includes(name)}
              />
            ))
          )}

          <SectionHeader title="Raw Schema" />
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
              {JSON.stringify(tool.inputSchema, null, 2)}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ParamRow({
  name,
  schema,
  required,
}: {
  name: string;
  schema: Record<string, unknown>;
  required: boolean;
}) {
  return (
    <View style={styles.paramRow}>
      <View style={styles.paramHeader}>
        <Text style={styles.paramName}>{name}</Text>
        {required && (
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>required</Text>
          </View>
        )}
        <Text style={styles.paramType}>{String(schema.type ?? 'any')}</Text>
      </View>
      {schema.description ? (
        <Text style={styles.paramDesc}>{String(schema.description)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg0 },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  toolCard: { marginBottom: 0 },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  toolName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text0,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: Spacing.sm,
  },
  toolDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text1,
    lineHeight: 18,
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.bg3,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg3,
  },
  modalTitle: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text0,
    fontFamily: 'monospace',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.text1,
    fontSize: 14,
  },
  modalBody: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  modalDesc: {
    fontSize: Typography.size.md,
    color: Colors.text1,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  noParams: {
    color: Colors.text2,
    fontSize: Typography.size.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  paramRow: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paramName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.accent,
    fontFamily: 'monospace',
    flex: 1,
  },
  paramType: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    fontFamily: 'monospace',
  },
  requiredBadge: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  requiredText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: Typography.weight.medium,
  },
  paramDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    lineHeight: 16,
  },
  codeBlock: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.md,
  },
  code: {
    fontSize: 12,
    color: Colors.text1,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
