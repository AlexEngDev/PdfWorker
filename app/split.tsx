import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getPdfDirectory } from '../utils/fileSystem';
import { splitPdfByRanges, extractPages } from '../utils/pdfSplit';

type SplitMode = 'range' | 'extract';

export default function SplitScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { colors } = useTheme();

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

  const selectPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPdfUri(asset.uri);
      setPdfName(asset.name);
      // Estimate page count (use a default of 5 since we can't easily parse PDF page count)
      const estimatedPages = 5;
      setPageCount(estimatedPages);
      setSelectedPages(new Set());
      setRangeInput('');
    }
  };

  const togglePage = (page: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  };

  const parseRanges = (input: string): Array<{ start: number; end: number }> => {
    const ranges: Array<{ start: number; end: number }> = [];
    const parts = input.split(',').map((s) => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && end <= pageCount) {
          ranges.push({ start, end });
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num > 0 && num <= pageCount) {
          ranges.push({ start: num, end: num });
        }
      }
    }
    return ranges;
  };

  const handleSplit = async () => {
    if (!pdfUri) return;

    setLoading(true);
    try {
      const dir = await getPdfDirectory();

      if (mode === 'range') {
        const ranges = parseRanges(rangeInput);
        if (ranges.length === 0) {
          Alert.alert('Error', 'Please enter valid page ranges (e.g. 1-3, 4-6).');
          setLoading(false);
          return;
        }
        const files = await splitPdfByRanges(pdfUri, ranges, dir);
        Alert.alert('Success', `Created ${files.length} split PDF file(s).`);
      } else {
        const pages = Array.from(selectedPages);
        if (pages.length === 0) {
          Alert.alert('Error', 'Please select at least one page to extract.');
          setLoading(false);
          return;
        }
        const filename = `extracted_${Date.now()}.pdf`;
        const destPath = `${dir}/${filename}`;
        await extractPages(pdfUri, pages, destPath);
        Alert.alert('Success', `Extracted ${pages.length} page(s) to ${filename}.`);
      }
    } catch {
      Alert.alert('Error', 'Failed to split PDF.');
    } finally {
      setLoading(false);
    }
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Select PDF Button */}
          <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={selectPdf}>
            <View style={[styles.selectIconWrapper, { backgroundColor: colors.warning + '1A' }]}>
              <Ionicons name="document-attach" size={22} color={colors.warning} />
            </View>
            <View style={styles.selectTextWrapper}>
              <Text style={[styles.selectTitle, { color: colors.textPrimary }]}>
                {pdfUri ? pdfName : 'Select PDF'}
              </Text>
              <Text style={[styles.selectSubtext, { color: colors.textMuted }]}>
                {pdfUri ? `${pageCount} pages estimated` : 'Choose a file to split'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {pdfUri && (
            <>
              {/* Page Count Adjuster */}
              <View style={[styles.pageCountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Number of pages</Text>
                <View style={styles.pageCountRow}>
                  <TouchableOpacity
                    style={[styles.pageCountButton, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
                    onPress={() => setPageCount((prev) => Math.max(1, prev - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.pageCountText, { color: colors.textPrimary }]}>{pageCount}</Text>
                  <TouchableOpacity
                    style={[styles.pageCountButton, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
                    onPress={() => setPageCount((prev) => prev + 1)}
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mode Selection */}
              <View style={[styles.modeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Split Mode</Text>
                <View style={styles.modeRow}>
                  <Pressable
                    style={[
                      styles.modeButton,
                      { backgroundColor: colors.surfaceHigh, borderColor: colors.border },
                      mode === 'range' && { backgroundColor: colors.warning + '1A', borderColor: colors.warning },
                    ]}
                    onPress={() => setMode('range')}
                  >
                    <Text
                      style={[styles.modeText, { color: colors.textSecondary }, mode === 'range' && { color: colors.warning }]}
                    >
                      Split by Range
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modeButton,
                      { backgroundColor: colors.surfaceHigh, borderColor: colors.border },
                      mode === 'extract' && { backgroundColor: colors.warning + '1A', borderColor: colors.warning },
                    ]}
                    onPress={() => setMode('extract')}
                  >
                    <Text
                      style={[styles.modeText, { color: colors.textSecondary }, mode === 'extract' && { color: colors.warning }]}
                    >
                      Extract Pages
                    </Text>
                  </Pressable>
                </View>
              </View>

              {mode === 'range' ? (
                <View style={[styles.rangeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Page Ranges</Text>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor: colors.surfaceHigh, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="e.g. 1-3, 4-6"
                    placeholderTextColor={colors.textMuted}
                    value={rangeInput}
                    onChangeText={setRangeInput}
                    keyboardType="default"
                    autoCapitalize="none"
                  />
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>
                    Separate ranges with commas. Each range creates a separate PDF.
                  </Text>
                </View>
              ) : (
                <View style={[styles.pagesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Select Pages</Text>
                  <View style={styles.pagesGrid}>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                      <Pressable
                        key={page}
                        style={[
                          styles.pageChip,
                          { backgroundColor: colors.surfaceHigh, borderColor: colors.border },
                          selectedPages.has(page) && { backgroundColor: colors.warning + '1A', borderColor: colors.warning },
                        ]}
                        onPress={() => togglePage(page)}
                      >
                        <Text
                          style={[
                            styles.pageChipText,
                            { color: colors.textSecondary },
                            selectedPages.has(page) && { color: colors.warning },
                          ]}
                        >
                          {page}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Split Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[styles.splitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && styles.buttonDisabled]}
                  onPress={handleSplit}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cut" size={20} color="#fff" />
                      <Text style={styles.splitButtonText}>Split PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
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
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  selectButton: {
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
  selectIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectTextWrapper: {
    flex: 1,
  },
  selectTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  pageCountCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pageCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  pageCountButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pageCountText: {
    fontSize: 24,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  modeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  rangeInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '400',
  },
  pagesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pageChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  splitButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  splitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
