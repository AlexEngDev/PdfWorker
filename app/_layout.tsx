import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

type IoniconsName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, activeName, color, focused }: { name: IoniconsName; activeName: IoniconsName; color: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
      <Ionicons name={focused ? activeName : name} size={24} color={color} />
    </View>
  );
}

function AppTabs() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          backgroundColor: colors.surface + 'E6',
          borderTopWidth: 0,
          borderRadius: 24,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        },
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          letterSpacing: -0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" activeName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="scan-outline" activeName="scan" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sign"
        options={{
          title: 'Sign',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="pencil-outline" activeName="pencil" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="convert"
        options={{
          title: 'Convert',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="images-outline" activeName="images" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="merge"
        options={{
          title: 'Merge',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="git-merge-outline" activeName="git-merge" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="split"
        options={{
          title: 'Split',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cut-outline" activeName="cut" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="compress"
        options={{
          title: 'Compress',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="archive-outline" activeName="archive" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: 'Files',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="folder-outline" activeName="folder" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="viewer" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="manage-pages" options={{ href: null }} />
      <Tabs.Screen name="watermark" options={{ href: null }} />
      <Tabs.Screen name="protect-pdf" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppTabs />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});
