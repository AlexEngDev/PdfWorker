import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import ActionButton from '../components/ActionButton';

const actions = [
  {
    label: 'Scan Document',
    icon: 'scan-outline' as const,
    route: '/scan' as const,
    color: Colors.primary,
  },
  {
    label: 'Sign PDF',
    icon: 'pencil-outline' as const,
    route: '/sign' as const,
    color: Colors.secondary,
  },
  {
    label: 'Convert to PDF',
    icon: 'images-outline' as const,
    route: '/convert' as const,
    color: Colors.success,
  },
  {
    label: 'My Files',
    icon: 'folder-outline' as const,
    route: '/files' as const,
    color: '#F59E0B',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="document-text" size={48} color={Colors.primary} />
          <Text style={styles.title}>PDF Worker</Text>
          <Text style={styles.subtitle}>Scan, sign, convert and manage PDFs</Text>
        </View>
        <View style={styles.grid}>
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
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
});
