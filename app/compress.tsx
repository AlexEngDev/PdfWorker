import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { getPdfDirectory, getFileSize } from '../utils/fileSystem';
import { compressPdf } from '../utils/pdfCompress';
import * as FileSystem from 'expo-file-system';

type Quality = 'high' | 'medium' | 'low';

const qualityOptions: Array<{
  key: Quality;
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = [
  {
    key: 'high',
    label: 'High',
    emoji: '🟢',
    description: '85% quality — Minimal compression',
    color: Colors.success,
  },
  {
    key: 'medium',
    label: 'Medium',
    emoji: '🟡',
    description: '60% quality — Balanced',
    color: Colors.warning,
  },
  {
    key: 'low',
    label: 'Low',
    emoji: '🔴',
    description: '35% quality — Maximum compression',
    color: Colors.danger,
  },
];

export default function CompressScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [quality, setQuality] = useState<Quality>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!pickerResult.canceled && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      setPdfUri(asset.uri);
      setPdfName(asset.name);
      setResult(null);

      const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
      const size = info.exists && 'size' in info ? (info.size ?? 0) : 0;
      setFileSize(size);
    }
  };

  const handleCompress = async () => {
    if (!pdfUri) return;

    setLoading(true);
    setResult(null);
    try {
      const dir = await getPdfDirectory();
      const filename = `compressed_${Date.now()}.pdf`;
      const destPath = `${dir}/${filename}`;
      const compressResult = await compressPdf(pdfUri, quality, destPath);
      setResult(compressResult);

      const saved =
        compressResult.originalSize > 0
          ? Math.round(
              ((compressResult.originalSize - compressResult.compressedSize) /
                compressResult.originalSize) *
                100
            )
          : 0;

      Alert.alert(
        'Success',
        `Compressed PDF saved as ${filename}.\nSaved ${Math.max(0, saved)}%.`
      );
    } catch {
      Alert.alert('Error', 'Failed to compress PDF.');
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Select PDF Button */}
          <TouchableOpacity style={styles.selectButton} onPress={selectPdf}>
            <View style={styles.selectIconWrapper}>
              <Ionicons name="document-attach" size={22} color={Colors.success} />
            </View>
            <View style={styles.selectTextWrapper}>
              <Text style={styles.selectTitle}>
                {pdfUri ? pdfName : 'Select PDF'}
              </Text>
              <Text style={styles.selectSubtext}>
                {pdfUri ? getFileSize(fileSize) : 'Choose a file to compress'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {pdfUri && (
            <>
              {/* Quality Selection */}
              <View style={styles.qualityCard}>
                <Text style={styles.cardLabel}>Compression Quality</Text>
                <View style={styles.qualityList}>
                  {qualityOptions.map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={[
                        styles.qualityOption,
                        quality === opt.key && {
                          backgroundColor: opt.color + '1A',
                          borderColor: opt.color,
                        },
                      ]}
                      onPress={() => setQuality(opt.key)}
                    >
                      <Text style={styles.qualityEmoji}>{opt.emoji}</Text>
                      <View style={styles.qualityInfo}>
                        <Text
                          style={[
                            styles.qualityLabel,
                            quality === opt.key && { color: opt.color },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.qualityDesc}>{opt.description}</Text>
                      </View>
                      {quality === opt.key && (
                        <Ionicons name="checkmark-circle" size={22} color={opt.color} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Result Card */}
              {result && (
                <View style={styles.resultCard}>
                  <Text style={styles.cardLabel}>Compression Result</Text>
                  <View style={styles.resultRow}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Original</Text>
                      <Text style={styles.resultValue}>{getFileSize(result.originalSize)}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>Compressed</Text>
                      <Text style={[styles.resultValue, { color: Colors.success }]}>
                        {getFileSize(result.compressedSize)}
                      </Text>
                    </View>
                  </View>
                  {result.originalSize > 0 && (
                    <View style={styles.savedBadge}>
                      <Text style={styles.savedText}>
                        Saved{' '}
                        {Math.max(
                          0,
                          Math.round(
                            ((result.originalSize - result.compressedSize) /
                              result.originalSize) *
                              100
                          )
                        )}
                        %
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Compress Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[styles.compressButton, loading && styles.buttonDisabled]}
                  onPress={handleCompress}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="archive" size={20} color="#fff" />
                      <Text style={styles.compressButtonText}>Compress PDF</Text>
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
    backgroundColor: Colors.background,
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
  selectIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.success + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectTextWrapper: {
    flex: 1,
  },
  selectTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  selectSubtext: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  qualityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  qualityList: {
    gap: 10,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qualityEmoji: {
    fontSize: 20,
  },
  qualityInfo: {
    flex: 1,
  },
  qualityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  qualityDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  resultItem: {
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  savedBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.success + '1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  savedText: {
    color: Colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  compressButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  compressButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
