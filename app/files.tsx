import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../constants/colors';
import DocumentCard from '../components/DocumentCard';
import { deletePdfFile, listPdfFiles } from '../utils/fileSystem';
import * as Sharing from 'expo-sharing';

export type PdfFile = {
  name: string;
  uri: string;
  size: number;
  modificationTime: number;
};

export default function FilesScreen() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={files}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFiles();
            }}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No PDFs found.</Text>
            <Text style={styles.emptySubtext}>
              Scan, convert or sign a document to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DocumentCard
            file={item}
            onShare={() => handleShare(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
