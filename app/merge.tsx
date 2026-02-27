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
import { getPdfDirectory, getFileSize } from '../utils/fileSystem';

type PdfItem = {
  uri: string;
  name: string;
  size: number;
};

export default function MergeScreen() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [merging, setMerging] = useState(false);

  const addPdfs = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
      copyToCacheDirectory: true,
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

  const doMerge = async () => {
    if (pdfs.length < 2) {
      Alert.alert('Not enough PDFs', 'Please add at least two PDFs to merge.');
      return;
    }
    setMerging(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `merged_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      await mergePdfs(pdfs.map((p) => p.uri), dest);
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
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={addPdfs}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add PDF</Text>
        </TouchableOpacity>

        {pdfs.length > 0 && (
          <Text style={styles.countText}>{pdfs.length} PDF(s) selected</Text>
        )}

        <FlatList
          data={pdfs}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                <View style={styles.cardText}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.fileSize}>{getFileSize(item.size)}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                  style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                >
                  <Ionicons
                    name="chevron-up-outline"
                    size={20}
                    color={index === 0 ? Colors.border : Colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveDown(index)}
                  disabled={index === pdfs.length - 1}
                  style={[
                    styles.iconButton,
                    index === pdfs.length - 1 && styles.iconButtonDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={
                      index === pdfs.length - 1 ? Colors.border : Colors.textSecondary
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeItem(index)}
                  style={styles.iconButton}
                >
                  <Ionicons name="close-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.mergeButton, (pdfs.length < 2 || merging) && styles.buttonDisabled]}
          onPress={doMerge}
          disabled={pdfs.length < 2 || merging}
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
    gap: 16,
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
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  cardText: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  mergeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
