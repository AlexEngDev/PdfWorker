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
import { protectPdf, unlockPdf } from '../utils/pdfProtect';

type Mode = 'protect' | 'unlock';

export default function ProtectPdfScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('protect');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
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
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setPdfUri(null);
    setPdfName('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleProcess = async () => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Please select a PDF file first.');
      return;
    }
    if (!password) {
      Alert.alert('No Password', 'Please enter a password.');
      return;
    }
    if (mode === 'protect' && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords do not match. Please try again.');
      return;
    }
    if (mode === 'protect' && password.length < 4) {
      Alert.alert('Weak Password', 'Please use at least 4 characters.');
      return;
    }
    setProcessing(true);
    try {
      const dir = await getPdfDirectory();
      const prefix = mode === 'protect' ? 'protected' : 'unlocked';
      const filename = `${prefix}_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      if (mode === 'protect') {
        await protectPdf(pdfUri, password, dest);
        Alert.alert('Success', `Encrypted PDF saved as ${filename}`, [
          { text: 'OK', onPress: () => { setPdfUri(null); setPdfName(''); setPassword(''); setConfirmPassword(''); } },
        ]);
      } else {
        await unlockPdf(pdfUri, password, dest);
        Alert.alert('Success', `Unlocked PDF saved as ${filename}`, [
          { text: 'OK', onPress: () => { setPdfUri(null); setPdfName(''); setPassword(''); } },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (
        mode === 'protect'
          ? 'Failed to encrypt the PDF. Please try another file.'
          : 'Failed to unlock the PDF. Please check the password and try again.'
      );
      Alert.alert('Not Available', msg);
    } finally {
      setProcessing(false);
    }
  };

  const isProtect = mode === 'protect';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Mode Toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              isProtect && { backgroundColor: colors.danger },
            ]}
            onPress={() => switchMode('protect')}
          >
            <Ionicons name="lock-closed" size={16} color={isProtect ? '#fff' : colors.textMuted} />
            <Text style={[styles.modeButtonText, { color: isProtect ? '#fff' : colors.textMuted }]}>
              Protect
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              !isProtect && { backgroundColor: colors.success },
            ]}
            onPress={() => switchMode('unlock')}
          >
            <Ionicons name="lock-open" size={16} color={!isProtect ? '#fff' : colors.textMuted} />
            <Text style={[styles.modeButtonText, { color: !isProtect ? '#fff' : colors.textMuted }]}>
              Unlock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={[styles.descBox, { backgroundColor: (isProtect ? colors.danger : colors.success) + '1A', borderColor: (isProtect ? colors.danger : colors.success) + '33' }]}>
          <Ionicons name={isProtect ? 'lock-closed-outline' : 'lock-open-outline'} size={18} color={isProtect ? colors.danger : colors.success} />
          <Text style={[styles.descText, { color: isProtect ? colors.danger : colors.success }]}>
            {isProtect
              ? 'Encrypt your PDF with a password so it can only be opened by those who know it.'
              : 'Provide the password to remove encryption and save an unlocked copy.'}
          </Text>
        </View>

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

        {/* Password Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {isProtect ? 'Set Password' : 'Enter Password'}
          </Text>
          <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {isProtect && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isProtect ? colors.danger : colors.success },
            processing && styles.disabled,
          ]}
          onPress={handleProcess}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isProtect ? 'lock-closed' : 'lock-open'} size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isProtect ? 'Encrypt PDF' : 'Remove Password'}
              </Text>
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
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  modeButtonText: { fontSize: 15, fontWeight: '600' },
  descBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  descText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
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
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  eyeBtn: { padding: 8 },
  actionButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
