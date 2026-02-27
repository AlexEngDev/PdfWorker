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
import { mergePdfs } from '../utils/pdfMerge';
import { getPdfDirectory } from '../utils/fileSystem';
import { getFileSize } from '../utils/fileSystem';

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
    if (!result.canceled && result.assets.length > 0) {
      const newItems: PdfItem[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size ?? 0,
      }));
      setPdfs((prev) => [...prev, ...newItems]);
    }
  };

  const removePdf = (index: number) => {
    setPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPdfs((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index: number) => {
    setPdfs((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleMerge = async () => {
    if (pdfs.length < 2) {
      Alert.alert('Error', 'Please add at least 2 PDF files to merge.');
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

  const renderItem = ({ item, index }: { item: PdfItem; index: number }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Ionicons name="document-outline" size={24} color={Colors.primary} />
        <View style={styles.cardText}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardSize}>{getFileSize(item.size)}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
          <Ionicons
            name="arrow-up-outline"
            size={22}
            color={index === 0 ? Colors.border : Colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => moveDown(index)} disabled={index === pdfs.length - 1}>
          <Ionicons
            name="arrow-down-outline"
            size={22}
            color={index === pdfs.length - 1 ? Colors.border : Colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removePdf(index)}>
          <Ionicons name="close-circle-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={addPdf}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add PDF</Text>
        </TouchableOpacity>

        {pdfs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No PDFs added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add PDF" to select files to merge</Text>
          </View>
        ) : (
          <FlatList
            data={pdfs}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}

        {pdfs.length >= 2 && (
          <TouchableOpacity
            style={[styles.mergeButton, merging && styles.buttonDisabled]}
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
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  list: {
    paddingTop: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardSize: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mergeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mergeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
