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
import { useTheme } from '../contexts/ThemeContext';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardLeftBorder, { backgroundColor: colors.accent }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <View style={[styles.cardIconWrapper, { backgroundColor: colors.danger + '1A' }]}>
            <Ionicons name="document-text" size={22} color={colors.danger} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardSize, { color: colors.textSecondary }]}>{getFileSize(item.size)}</Text>
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
              color={index === 0 ? colors.textMuted : colors.primaryLight}
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
              color={index === pdfs.length - 1 ? colors.textMuted : colors.primaryLight}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removePdf(index)} style={styles.arrowButton}>
            <Ionicons name="close-circle" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={addPdf}>
          <View style={[styles.addIconWrapper, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </View>
          <View style={styles.addTextWrapper}>
            <Text style={[styles.addButtonTitle, { color: colors.textPrimary }]}>Add PDF</Text>
            <Text style={[styles.addButtonSubtext, { color: colors.textMuted }]}>Select files to merge</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {pdfs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: colors.surfaceHigh }]}>
              <Ionicons name="documents" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No PDFs added yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap "Add PDF" to select files to merge</Text>
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
            style={[styles.mergeButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, merging && styles.buttonDisabled]}
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTextWrapper: {
    flex: 1,
  },
  addButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addButtonSubtext: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
  },
  list: {
    paddingTop: 16,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSize: {
    fontSize: 12,
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
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
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
