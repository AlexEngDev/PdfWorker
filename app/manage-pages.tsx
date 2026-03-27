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
import { getPdfDirectory } from '../utils/fileSystem';
import { applyPageEdits, getPdfPageCount, PageItem } from '../utils/pdfManage';

const ROTATION_STEPS: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

export default function ManagePagesScreen() {
  const { colors } = useTheme();
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setLoading(true);
    try {
      const count = await getPdfPageCount(asset.uri);
      setPdfUri(asset.uri);
      setPdfName(asset.name);
      setPages(
        Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          rotation: 0,
          deleted: false,
        }))
      );
    } catch {
      Alert.alert('Error', 'Could not read the PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  };

  const rotateRight = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const currentIdx = ROTATION_STEPS.indexOf(p.rotation);
        const nextRotation = ROTATION_STEPS[(currentIdx + 1) % ROTATION_STEPS.length];
        return { ...p, rotation: nextRotation };
      })
    );
  };

  const toggleDelete = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index: number) => {
    setPages((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleSave = async () => {
    if (!pdfUri) return;
    const activeCount = pages.filter((p) => !p.deleted).length;
    if (activeCount === 0) {
      Alert.alert('Error', 'All pages are deleted. Please keep at least one page.');
      return;
    }
    setSaving(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `managed_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      await applyPageEdits(pdfUri, pages, dest);
      Alert.alert('Success', `Saved as ${filename}`, [
        { text: 'OK', onPress: () => { setPdfUri(null); setPages([]); } },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save the modified PDF.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, index }: { item: PageItem; index: number }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: item.deleted ? colors.surfaceHigh : colors.surface,
          borderColor: item.deleted ? colors.danger + '66' : colors.border,
          opacity: item.deleted ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.cardBorder, { backgroundColor: item.deleted ? colors.danger : colors.primary }]} />
      <View style={[styles.pageIcon, { backgroundColor: colors.primary + '1A' }]}>
        <Ionicons name="document-text" size={20} color={colors.primary} />
        <Text style={[styles.pageNum, { color: colors.primary }]}>{index + 1}</Text>
      </View>
      <View style={styles.pageInfo}>
        <Text style={[styles.pageName, { color: colors.textPrimary }]}>
          Page {item.originalIndex + 1}
        </Text>
        {item.rotation !== 0 && (
          <Text style={[styles.pageMeta, { color: colors.accent }]}>
            ↻ {item.rotation}°
          </Text>
        )}
        {item.deleted && (
          <Text style={[styles.pageMeta, { color: colors.danger }]}>Deleted</Text>
        )}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0} style={styles.actionBtn}>
          <Ionicons name="chevron-up" size={18} color={index === 0 ? colors.textMuted : colors.primaryLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => moveDown(index)} disabled={index === pages.length - 1} style={styles.actionBtn}>
          <Ionicons name="chevron-down" size={18} color={index === pages.length - 1 ? colors.textMuted : colors.primaryLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => rotateRight(index)} style={styles.actionBtn}>
          <Ionicons name="refresh" size={18} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleDelete(index)} style={styles.actionBtn}>
          <Ionicons
            name={item.deleted ? 'arrow-undo' : 'trash-outline'}
            size={18}
            color={item.deleted ? colors.success : colors.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.pickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={pickPdf}
        >
          <View style={[styles.pickIcon, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="document" size={22} color={colors.primary} />
          </View>
          <View style={styles.pickTextWrapper}>
            <Text style={[styles.pickTitle, { color: colors.textPrimary }]}>
              {pdfUri ? pdfName : 'Select PDF'}
            </Text>
            <Text style={[styles.pickSubtext, { color: colors.textMuted }]}>
              {pdfUri ? `${pages.length} pages` : 'Tap to pick a PDF file'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Reading PDF…</Text>
          </View>
        )}

        {!loading && pages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceHigh }]}>
              <Ionicons name="layers-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No PDF selected</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Select a PDF to rotate, delete or reorder its pages
            </Text>
          </View>
        )}

        {pages.length > 0 && (
          <>
            <View style={[styles.infoRow, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '33' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                ↻ Rotate  ·  ↑↓ Reorder  ·  🗑 Delete (tap again to restore)
              </Text>
            </View>
            <FlatList
              data={pages}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Modified PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 100 },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  pickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickTextWrapper: { flex: 1 },
  pickTitle: { fontSize: 15, fontWeight: '600' },
  pickSubtext: { fontSize: 13, marginTop: 2 },
  loadingWrapper: { alignItems: 'center', marginTop: 40, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 12, fontWeight: '500' },
  list: { gap: 10, paddingTop: 8, paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0, width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  pageIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  pageNum: { fontSize: 11, fontWeight: '700' },
  pageInfo: { flex: 1 },
  pageName: { fontSize: 14, fontWeight: '600' },
  pageMeta: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 2 },
  actionBtn: { padding: 6, borderRadius: 10 },
  saveButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
