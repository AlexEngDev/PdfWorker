import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
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
import SignatureCanvasComponent from '../components/SignatureCanvas';
import { savePdf } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';
import {
  getSavedSignatures,
  saveSignature,
  deleteSignature,
} from '../utils/signatures';
import type { SavedSignature } from '../types/signature';

type SignatureMode = 'choose' | 'draw' | 'saved';

export default function SignScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('choose');
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const signatureRef = useRef<{ clearSignature: () => void }>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const loadSignatures = useCallback(async () => {
    const sigs = await getSavedSignatures();
    setSavedSignatures(sigs);
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name);
      setSignatureData(null);
      setSignatureMode('choose');
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
  };

  const handleSelectSaved = (sig: SavedSignature) => {
    setSignatureData(sig.data);
  };

  const resetToChoose = () => {
    setSignatureMode('choose');
    setSignatureData(null);
  };

  const handleDeleteSaved = (sig: SavedSignature) => {
    Alert.alert('Delete Signature', `Delete "${sig.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSignature(sig.id);
          await loadSignatures();
          if (signatureData === sig.data) {
            setSignatureData(null);
          }
        },
      },
    ]);
  };

  const promptSaveSignature = (data: string) => {
    Alert.alert('Save Signature', 'Save this signature for future use?', [
      { text: 'Skip' },
      {
        text: 'Save',
        onPress: async () => {
          const name = `Signature ${savedSignatures.length + 1}`;
          await saveSignature(name, data);
          await loadSignatures();
        },
      },
    ]);
  };

  const saveSignedPdf = async () => {
    if (!pdfUri || !signatureData) {
      Alert.alert('Missing info', 'Please select a PDF and add a signature.');
      return;
    }
    setSaving(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `signed_${Date.now()}.pdf`;
      const dest = `${dir}/${filename}`;
      const html = `
        <html><body style="margin:0;padding:20px;background:${Colors.background};">
          <h3 style="color:${Colors.textPrimary};">Signed Document</h3>
          <p style="color:${Colors.textSecondary};">Original: ${pdfName}</p>
          <hr style="border-color:${Colors.border};"/>
          <p style="color:${Colors.textSecondary};">Signature:</p>
          <img src="${signatureData}" style="max-width:300px;border:2px solid ${Colors.border};border-radius:12px;" />
        </body></html>
      `;
      await savePdf(html, dest);
      Alert.alert('Success', `Signed PDF saved as ${filename}`);

      if (signatureMode === 'draw') {
        promptSaveSignature(signatureData);
      }

      setSignatureData(null);
      signatureRef.current?.clearSignature();
    } catch {
      Alert.alert('Error', 'Failed to save signed PDF.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.pickButton} onPress={pickPdf}>
            <View style={styles.pickIconWrapper}>
              <Ionicons name="document" size={22} color={Colors.primary} />
            </View>
            <View style={styles.pickTextWrapper}>
              <Text style={styles.pickButtonText}>
                {pdfUri ? pdfName : 'Select PDF Document'}
              </Text>
              {!pdfUri && (
                <Text style={styles.pickSubtext}>Tap to choose a file</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {pdfUri && signatureMode === 'choose' && (
            <View style={styles.modeSelection}>
              <Text style={styles.sectionTitle}>Choose Signature Method</Text>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={styles.modeCard}
                  onPress={() => setSignatureMode('draw')}
                >
                  <View style={[styles.modeIconWrapper, { backgroundColor: Colors.primary + '1A' }]}>
                    <Ionicons name="brush" size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.modeCardTitle}>Draw</Text>
                  <Text style={styles.modeCardDesc}>Create a new signature</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeCard}
                  onPress={() => {
                    loadSignatures();
                    setSignatureMode('saved');
                  }}
                >
                  <View style={[styles.modeIconWrapper, { backgroundColor: Colors.secondary + '1A' }]}>
                    <Ionicons name="bookmark" size={28} color={Colors.secondary} />
                  </View>
                  <Text style={styles.modeCardTitle}>Saved</Text>
                  <Text style={styles.modeCardDesc}>Use existing signature</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {pdfUri && signatureMode === 'draw' && (
            <>
              <View style={styles.modeHeader}>
                <Text style={styles.sectionTitle}>Draw Signature</Text>
                <TouchableOpacity onPress={resetToChoose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color={Colors.primaryLight} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              </View>
              <SignatureCanvasComponent
                ref={signatureRef}
                onSignature={handleSignature}
              />
              <TouchableOpacity
                style={[styles.button, (!signatureData || saving) && styles.buttonDisabled]}
                onPress={saveSignedPdf}
                disabled={!signatureData || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Save Signed PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {pdfUri && signatureMode === 'saved' && (
            <>
              <View style={styles.modeHeader}>
                <Text style={styles.sectionTitle}>Saved Signatures</Text>
                <TouchableOpacity onPress={resetToChoose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={16} color={Colors.primaryLight} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              </View>
              {savedSignatures.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrapper}>
                    <Ionicons name="bookmark" size={36} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.emptyText}>No saved signatures</Text>
                  <Text style={styles.emptySubtext}>
                    Draw a new signature and save it for future use
                  </Text>
                </View>
              ) : (
                <>
                  <FlatList
                    horizontal
                    data={savedSignatures}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.signatureList}
                    scrollEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.signatureCard,
                          signatureData === item.data && styles.signatureCardSelected,
                        ]}
                        onPress={() => handleSelectSaved(item)}
                        onLongPress={() => handleDeleteSaved(item)}
                      >
                        <View style={styles.signaturePreviewWrapper}>
                          <Image
                            source={{ uri: item.data }}
                            style={styles.signaturePreview}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={styles.signatureName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteSignatureBtn}
                          onPress={() => handleDeleteSaved(item)}
                        >
                          <Ionicons name="trash" size={14} color={Colors.danger} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={[styles.button, (!signatureData || saving) && styles.buttonDisabled]}
                    onPress={saveSignedPdf}
                    disabled={!signatureData || saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Save Signed PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  flex1: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  pickButton: {
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
  pickIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickTextWrapper: {
    flex: 1,
  },
  pickButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  pickSubtext: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  modeSelection: {
    gap: 14,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modeCardDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  signatureList: {
    gap: 12,
    paddingVertical: 4,
  },
  signatureCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 16,
    padding: 12,
    width: 150,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
  },
  signatureCardSelected: {
    borderColor: Colors.primary,
  },
  signaturePreviewWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    width: '100%',
  },
  signaturePreview: {
    width: '100%',
    height: 60,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  deleteSignatureBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
});
