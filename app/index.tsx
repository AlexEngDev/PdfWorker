import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ActionButton from '../components/ActionButton';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const actions = [
  { label: 'Scan Document', icon: 'scan' as const, route: '/scan' as const, colorKey: 'primary' as const },
  { label: 'Sign PDF', icon: 'pencil' as const, route: '/sign' as const, colorKey: 'secondary' as const },
  { label: 'Convert to PDF', icon: 'images' as const, route: '/convert' as const, colorKey: 'success' as const },
  { label: 'Merge PDFs', icon: 'git-merge' as const, route: '/merge' as const, colorKey: 'secondary' as const },
  { label: 'Split PDF', icon: 'cut' as const, route: '/split' as const, colorKey: 'warning' as const },
  { label: 'Compress PDF', icon: 'archive' as const, route: '/compress' as const, colorKey: 'success' as const },
  { label: 'Manage Pages', icon: 'layers' as const, route: '/manage-pages' as const, colorKey: 'accent' as const },
  { label: 'Watermark PDF', icon: 'water' as const, route: '/watermark' as const, colorKey: 'primary' as const },
  { label: 'Protect / Unlock PDF', icon: 'lock-closed' as const, route: '/protect-pdf' as const, colorKey: 'danger' as const },
  { label: 'PDF to Images', icon: 'images-outline' as const, route: '/pdf-to-image' as const, colorKey: 'accent' as const },
  { label: 'Extract Text (OCR)', icon: 'text' as const, route: '/ocr' as const, colorKey: 'primaryLight' as const },
  { label: 'My Files', icon: 'folder' as const, route: '/files' as const, colorKey: 'warning' as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textPrimary }]}>{getGreeting()} 👋</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{getFormattedDate()}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityLabel="Toggle dark/light mode"
              >
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="person" size={22} color={colors.primaryLight} />
              </View>
            </View>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statsIconWrapper, { backgroundColor: colors.primary + '1A' }]}>
              <Ionicons name="document-text" size={28} color={colors.primary} />
            </View>
            <View style={styles.statsInfo}>
              <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>PDF Worker</Text>
              <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>Your all-in-one PDF toolkit</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Actions</Text>

          <View style={styles.actionsList}>
            {actions.map((action) => (
              <ActionButton
                key={action.route}
                label={action.label}
                icon={action.icon}
                color={colors[action.colorKey]}
                onPress={() => router.push(action.route)}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 22,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  statsIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsInfo: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  actionsList: {
    gap: 12,
  },
});
