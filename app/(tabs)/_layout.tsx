import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../src/utils/theme';
import { useMcp } from '../../src/context/McpContext';
import { StatusDot } from '../../src/components/ui';

function TabIcon({
  label,
  emoji,
  focused,
}: {
  label: string;
  emoji: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {emoji}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { connectionState } = useMcp();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.bg1,
          borderTopColor: Colors.bg3,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 12,
        },
        tabBarShowLabel: false,
        headerStyle: { backgroundColor: Colors.bg1 },
        headerTintColor: Colors.text0,
        headerTitleStyle: {
          fontWeight: '600',
          letterSpacing: 0.5,
          fontSize: Typography.size.lg,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'PolarDog Intel',
          headerRight: () => (
            <View style={styles.headerStatus}>
              <StatusDot status={connectionState.status as any} />
              <Text style={styles.headerStatusText}>
                {connectionState.status === 'connected'
                  ? connectionState.serverInfo?.name ?? 'Snowflake'
                  : connectionState.status}
              </Text>
            </View>
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Chat" emoji="💬" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'MCP Tools',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Tools" emoji="🔧" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explorer"
        options={{
          title: 'Data Explorer',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Data" emoji="❄️" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.text2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.accent,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  headerStatusText: {
    fontSize: 12,
    color: Colors.text1,
    textTransform: 'capitalize',
  },
});
