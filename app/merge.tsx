import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { getPdfDirectory } from '../utils/fileSystem';
import { getFileSize } from '../utils/fileSystem';
import { mergePdfs } from '../utils/pdfMerge';

type PdfItem = {
  uri: string;
  name: string;
  size: number;
};

export default function MergeScreen() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [merging, setMerging] = useState(false);

  const addPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled) {
      const newItems: PdfItem[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size ?? 0,
      }));
      setPdfs((prev) => [...prev, ...newItems]);
    }
  };

  const removeItem = (index: number) => {
    setPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPdfs((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setPdfs((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleMerge = async () => {
    if (pdfs.length < 2) {
      Alert.alert('Not enough files', 'Please add at least 2 PDF files to merge.');
      return;
    }
    setMerging(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `merged_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      await mergePdfs(
        pdfs.map((p) => p.uri),
        dest
      );
      Alert.alert('Success', `Merged PDF saved as ${filename}`);
      setPdfs([]);
    } catch {
      Alert.alert('Error', 'Failed to merge PDFs.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={pdfs}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addButton} onPress={addPdf}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addButtonText}>Add PDF</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No PDFs added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add PDF" to select files</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Ionicons name="document-outline" size={20} color={Colors.primary} />
              <View style={styles.cardText}>
                <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="middle">{item.name}</Text>
                <Text style={styles.cardSize}>{getFileSize(item.size)}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0} style={styles.iconBtn}>
                <Ionicons name="chevron-up-outline" size={20} color={index === 0 ? Colors.border : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(index)} disabled={index === pdfs.length - 1} style={styles.iconBtn}>
                <Ionicons name="chevron-down-outline" size={20} color={index === pdfs.length - 1 ? Colors.border : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.iconBtn}>
                <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          pdfs.length >= 2 ? (
            <TouchableOpacity
              style={[styles.mergeButton, merging && styles.mergeButtonDisabled]}
              onPress={handleMerge}
              disabled={merging}
            >
              {merging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="git-merge-outline" size={20} color="#fff" />
                  <Text style={styles.mergeButtonText}>Merge PDFs</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
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
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  cardSize: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  mergeButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  mergeButtonDisabled: {
    opacity: 0.5,
  },
  mergeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
