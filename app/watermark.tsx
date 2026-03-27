import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { addWatermark } from '../utils/pdfWatermark';

const OPACITY_OPTIONS = [0.15, 0.3, 0.5, 0.75];
const FONT_SIZE_OPTIONS = [24, 36, 48, 64];

export default function WatermarkScreen() {
  const { colors } = useTheme();
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(48);
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
    setPdfUri(asset.uri);
    setPdfName(asset.name);
  };

  const handleApply = async () => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Please select a PDF first.');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Empty text', 'Please enter watermark text.');
      return;
    }
    setSaving(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `watermarked_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      await addWatermark(pdfUri, { text: trimmed, opacity, fontSize }, dest);
      Alert.alert('Success', `Watermarked PDF saved as ${filename}`, [
        { text: 'OK', onPress: () => { setPdfUri(null); setPdfName(''); } },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add watermark. Please try another PDF.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* PDF Picker */}
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
              {pdfUri ? 'Tap to change' : 'Tap to pick a PDF file'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Watermark Text */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Watermark Text</Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="e.g. CONFIDENTIAL"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            autoCapitalize="characters"
          />
        </View>

        {/* Opacity */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Opacity</Text>
          <View style={styles.optionRow}>
            {OPACITY_OPTIONS.map((op) => (
              <TouchableOpacity
                key={op}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: opacity === op ? colors.primary : colors.surface,
                    borderColor: opacity === op ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setOpacity(op)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    { color: opacity === op ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {Math.round(op * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Font Size</Text>
          <View style={styles.optionRow}>
            {FONT_SIZE_OPTIONS.map((sz) => (
              <TouchableOpacity
                key={sz}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: fontSize === sz ? colors.accent : colors.surface,
                    borderColor: fontSize === sz ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setFontSize(sz)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    { color: fontSize === sz ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {sz}pt
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview hint */}
        <View style={[styles.previewBox, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
          <Text
            style={[
              styles.previewText,
              { color: colors.textMuted, fontSize: Math.min(fontSize / 2, 28), opacity },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {text || 'WATERMARK'}
          </Text>
        </View>

        {/* Apply Button */}
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: colors.primary }, saving && styles.disabled]}
          onPress={handleApply}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="water" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Watermark</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 100, gap: 20 },
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
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  optionChipText: { fontSize: 14, fontWeight: '600' },
  previewBox: {
    borderRadius: 14,
    borderWidth: 1,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '-10deg' }],
  },
  previewText: { fontWeight: '800', letterSpacing: 2 },
  applyButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
