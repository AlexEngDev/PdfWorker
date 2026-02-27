import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      <View style={[styles.cardLeftBorder, { backgroundColor: Colors.accent }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <View style={styles.cardIconWrapper}>
            <Ionicons name="document-text" size={22} color={Colors.danger} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardSize}>{getFileSize(item.size)}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => moveUp(index)}
            disabled={index === 0}
            style={styles.arrowButton}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? Colors.textMuted : Colors.primaryLight}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => moveDown(index)}
            disabled={index === pdfs.length - 1}
            style={styles.arrowButton}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === pdfs.length - 1 ? Colors.textMuted : Colors.primaryLight}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removePdf(index)} style={styles.arrowButton}>
            <Ionicons name="close-circle" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.addButton} onPress={addPdf}>
          <View style={styles.addIconWrapper}>
            <Ionicons name="add-circle" size={22} color={Colors.primary} />
          </View>
          <View style={styles.addTextWrapper}>
            <Text style={styles.addButtonTitle}>Add PDF</Text>
            <Text style={styles.addButtonSubtext}>Select files to merge</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {pdfs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="documents" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No PDFs added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add PDF" to select files to merge</Text>
          </View>
        ) : (
          <FlatList
            data={pdfs}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
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
                <Ionicons name="git-merge" size={20} color="#fff" />
                <Text style={styles.mergeButtonText}>Merge {pdfs.length} PDFs</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTextWrapper: {
    flex: 1,
  },
  addButtonTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  addButtonSubtext: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  list: {
    paddingTop: 16,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingLeft: 16,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.danger + '1A',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '400',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowButton: {
    padding: 6,
    borderRadius: 12,
  },
  mergeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
