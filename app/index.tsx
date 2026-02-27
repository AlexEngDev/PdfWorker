import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
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
  {
    label: 'Scan Document',
    icon: 'scan' as const,
    route: '/scan' as const,
    color: Colors.primary,
  },
  {
    label: 'Sign PDF',
    icon: 'pencil' as const,
    route: '/sign' as const,
    color: Colors.secondary,
  },
  {
    label: 'Convert to PDF',
    icon: 'images' as const,
    route: '/convert' as const,
    color: Colors.success,
  },
  {
    label: 'Merge PDFs',
    icon: 'git-merge' as const,
    route: '/merge' as const,
    color: Colors.secondary,
  },
  {
    label: 'Split PDF',
    icon: 'cut' as const,
    route: '/split' as const,
    color: Colors.warning,
  },
  {
    label: 'Compress PDF',
    icon: 'archive' as const,
    route: '/compress' as const,
    color: Colors.success,
  },
  {
    label: 'My Files',
    icon: 'folder' as const,
    route: '/files' as const,
    color: Colors.warning,
  },
];

export default function HomeScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.date}>{getFormattedDate()}</Text>
            </View>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={Colors.primaryLight} />
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsIconWrapper}>
              <Ionicons name="document-text" size={28} color={Colors.primary} />
            </View>
            <View style={styles.statsInfo}>
              <Text style={styles.statsTitle}>PDF Worker</Text>
              <Text style={styles.statsSubtitle}>Your all-in-one PDF toolkit</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsList}>
            {actions.map((action) => (
              <ActionButton
                key={action.route}
                label={action.label}
                icon={action.icon}
                color={action.color}
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
    backgroundColor: Colors.background,
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
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 22,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsInfo: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statsSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  actionsList: {
    gap: 12,
  },
});
