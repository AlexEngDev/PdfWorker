import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DocumentCard from '../components/DocumentCard';
import { deletePdfFile, listPdfFiles, renamePdfFile, sanitizeFileName } from '../utils/fileSystem';
import * as Sharing from 'expo-sharing';
import type { PdfFile } from '../types/pdf';

export default function FilesScreen() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const loadFiles = useCallback(async () => {
    try {
      const pdfs = await listPdfFiles();
      setFiles(pdfs);
    } catch {
      Alert.alert('Error', 'Failed to load files.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFiles();
    }, [loadFiles])
  );

  const handleShare = async (file: PdfFile) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Error', 'Failed to share file.');
    }
  };

  const handleDelete = (file: PdfFile) => {
    Alert.alert('Delete', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePdfFile(file.uri);
            setFiles((prev) => prev.filter((f) => f.uri !== file.uri));
          } catch {
            Alert.alert('Error', 'Failed to delete file.');
          }
        },
      },
    ]);
  };

  const handleRename = async (file: PdfFile, newName: string) => {
    try {
      const newUri = await renamePdfFile(file.uri, newName);
      setFiles((prev) =>
        prev.map((f) =>
          f.uri === file.uri
            ? { ...f, uri: newUri, name: `${sanitizeFileName(newName)}.pdf` }
            : f
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename file.';
      Alert.alert('Error', message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
        <FlatList
          data={files}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFiles();
              }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="folder-open" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No PDFs found</Text>
              <Text style={styles.emptySubtext}>
                Scan, convert or sign a document to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DocumentCard
              file={item}
              onView={() => router.push({ pathname: '/viewer', params: { uri: item.uri, name: item.name } })}
              onShare={() => handleShare(item)}
              onDelete={() => handleDelete(item)}
              onRename={(newName) => handleRename(item, newName)}
            />
          )}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 22,
  },
});
