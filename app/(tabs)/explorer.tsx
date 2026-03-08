import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMcp } from '../../src/context/McpContext';
import { Colors, Typography, Spacing, Radius } from '../../src/utils/theme';
import { Button, Card, SectionHeader, EmptyState } from '../../src/components/ui';

interface QueryResult {
  columns: string[];
  rows: string[][];
  rowCount: number;
  durationMs: number;
}

export default function ExplorerScreen() {
  const { callTool, tools, connectionState } = useMcp();
  const [sql, setSql] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = connectionState.status === 'connected';

  // Find a SQL execution tool from available MCP tools
  const sqlTool = tools.find(
    (t) =>
      t.name.toLowerCase().includes('query') ||
      t.name.toLowerCase().includes('sql') ||
      t.name.toLowerCase().includes('execute')
  );

  const runQuery = async () => {
    if (!sql.trim() || isRunning || !sqlTool) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    const start = Date.now();
    try {
      const mcpResult = await callTool({
        name: sqlTool.name,
        arguments: { query: sql.trim(), sql: sql.trim(), statement: sql.trim() },
      });

      const durationMs = Date.now() - start;
      const textContent = mcpResult.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');

      // Try to parse as JSON table
      try {
        const parsed = JSON.parse(textContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const columns = Object.keys(parsed[0]);
          const rows = parsed.map((row: Record<string, unknown>) =>
            columns.map((col) => String(row[col] ?? ''))
          );
          setResult({ columns, rows, rowCount: rows.length, durationMs });
        } else if (parsed.data && Array.isArray(parsed.data)) {
          const columns = parsed.columns ?? Object.keys(parsed.data[0] ?? {});
          const rows = parsed.data.map((row: unknown[]) =>
            row.map(String)
          );
          setResult({ columns, rows, rowCount: rows.length, durationMs });
        } else {
          setResult({
            columns: ['Result'],
            rows: [[JSON.stringify(parsed, null, 2)]],
            rowCount: 1,
            durationMs,
          });
        }
      } catch {
        // Plain text result
        setResult({
          columns: ['Output'],
          rows: textContent.split('\n').map((line) => [line]),
          rowCount: 1,
          durationMs,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        {/* SQL editor */}
        <Card style={styles.editorCard}>
          <Text style={styles.editorLabel}>SQL QUERY</Text>
          <TextInput
            style={styles.sqlInput}
            value={sql}
            onChangeText={setSql}
            placeholder="SELECT * FROM my_table LIMIT 10;"
            placeholderTextColor={Colors.text2}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={isConnected}
          />
          <View style={styles.editorFooter}>
            {sqlTool ? (
              <Text style={styles.toolHint}>via {sqlTool.name}</Text>
            ) : (
              <Text style={styles.toolHint}>
                {isConnected ? 'No SQL tool found on server' : 'Not connected'}
              </Text>
            )}
            <Button
              label={isRunning ? 'Running…' : '▶ Run'}
              onPress={runQuery}
              loading={isRunning}
              disabled={!sql.trim() || !sqlTool || !isConnected}
              variant="primary"
              style={{ paddingVertical: 8, paddingHorizontal: Spacing.md, minHeight: 36 }}
            />
          </View>
        </Card>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Query Error</Text>
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View>
            <SectionHeader
              title={`${result.rowCount} row${result.rowCount !== 1 ? 's' : ''} · ${result.durationMs}ms`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Header */}
                <View style={styles.tableRow}>
                  {result.columns.map((col) => (
                    <View key={col} style={styles.tableHeaderCell}>
                      <Text style={styles.tableHeaderText}>{col}</Text>
                    </View>
                  ))}
                </View>
                {/* Rows */}
                {result.rows.slice(0, 200).map((row, i) => (
                  <View
                    key={i}
                    style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                  >
                    {row.map((cell, j) => (
                      <View key={j} style={styles.tableCell}>
                        <Text style={styles.tableCellText} numberOfLines={1}>
                          {cell}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
                {result.rows.length > 200 && (
                  <Text style={styles.truncNote}>
                    Showing 200 of {result.rows.length} rows
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {!result && !error && !isRunning && (
          <EmptyState
            icon="❄️"
            title="Run a query"
            subtitle="Type SQL above and hit Run to explore your Snowflake data."
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg0 },
  inner: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },

  editorCard: { gap: Spacing.sm },
  editorLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text2,
    letterSpacing: 1.5,
  },
  sqlInput: {
    minHeight: 120,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.sm,
    color: Colors.text0,
    fontSize: Typography.size.sm,
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolHint: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: Spacing.sm,
  },

  errorBox: {
    backgroundColor: 'rgba(245,90,77,0.08)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  errorTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.error,
  },
  errorMsg: {
    fontSize: Typography.size.sm,
    color: Colors.text1,
    fontFamily: 'monospace',
  },

  // Table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg3,
  },
  tableRowAlt: {
    backgroundColor: Colors.bg1,
  },
  tableHeaderCell: {
    minWidth: 100,
    maxWidth: 200,
    padding: Spacing.sm,
    backgroundColor: Colors.bg2,
    borderRightWidth: 1,
    borderRightColor: Colors.bg3,
  },
  tableHeaderText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  tableCell: {
    minWidth: 100,
    maxWidth: 200,
    padding: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.bg3,
  },
  tableCellText: {
    fontSize: Typography.size.xs,
    color: Colors.text0,
    fontFamily: 'monospace',
  },
  truncNote: {
    fontSize: Typography.size.xs,
    color: Colors.text2,
    padding: Spacing.sm,
    textAlign: 'center',
  },
});
