import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
        <html><body style="margin:0;padding:20px;">
          <h3 style="color:#1E293B;">Signed Document</h3>
          <p style="color:#64748B;">Original: ${pdfName}</p>
          <hr/>
          <p style="color:#64748B;">Signature:</p>
          <img src="${signatureData}" style="max-width:300px;border:1px solid #E2E8F0;border-radius:8px;" />
        </body></html>
      `;
      await savePdf(html, dest);
      Alert.alert('Success', `Signed PDF saved as ${filename}`);

      // Offer to save signature if it was drawn (not from saved list)
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
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.pickButton} onPress={pickPdf}>
          <Ionicons name="document-outline" size={24} color={Colors.primary} />
          <Text style={styles.pickButtonText}>
            {pdfUri ? pdfName : 'Select PDF Document'}
          </Text>
        </TouchableOpacity>

        {pdfUri && signatureMode === 'choose' && (
          <View style={styles.modeSelection}>
            <Text style={styles.sectionTitle}>Choose Signature Method</Text>
            <View style={styles.modeButtons}>
              <TouchableOpacity
                style={styles.modeCard}
                onPress={() => setSignatureMode('draw')}
              >
                <Ionicons name="brush-outline" size={28} color={Colors.primary} />
                <Text style={styles.modeCardText}>Draw New Signature</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modeCard}
                onPress={() => {
                  loadSignatures();
                  setSignatureMode('saved');
                }}
              >
                <Ionicons name="bookmark-outline" size={28} color={Colors.secondary} />
                <Text style={styles.modeCardText}>Use Saved Signature</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pdfUri && signatureMode === 'draw' && (
          <>
            <View style={styles.modeHeader}>
              <Text style={styles.sectionTitle}>Draw Signature</Text>
              <TouchableOpacity onPress={resetToChoose}>
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
                  <Ionicons name="save-outline" size={20} color="#fff" />
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
              <TouchableOpacity onPress={resetToChoose}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>
            {savedSignatures.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={40} color={Colors.border} />
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
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.signatureCard,
                        signatureData === item.data && styles.signatureCardSelected,
                      ]}
                      onPress={() => handleSelectSaved(item)}
                      onLongPress={() => handleDeleteSaved(item)}
                    >
                      <Image
                        source={{ uri: item.data }}
                        style={styles.signaturePreview}
                        resizeMode="contain"
                      />
                      <Text style={styles.signatureName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteSignatureBtn}
                        onPress={() => handleDeleteSaved(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
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
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Save Signed PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  pickButton: {
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
  pickButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modeSelection: {
    gap: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
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
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
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
    textAlign: 'center',
  },
  signatureList: {
    gap: 12,
    paddingVertical: 4,
  },
  signatureCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    width: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
  },
  signatureCardSelected: {
    borderColor: Colors.primary,
  },
  signaturePreview: {
    width: 120,
    height: 60,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  deleteSignatureBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
});
