import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  type SavedSignature,
} from '../utils/signatures';

type SignMode = 'choose' | 'draw' | 'saved';

export default function SignScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signMode, setSignMode] = useState<SignMode>('choose');
  const [savedSigs, setSavedSigs] = useState<SavedSignature[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<SavedSignature | null>(null);
  const signatureRef = useRef<{ clearSignature: () => void }>(null);

  const loadSavedSignatures = useCallback(async () => {
    const sigs = await getSavedSignatures();
    setSavedSigs(sigs);
  }, []);

  useEffect(() => {
    loadSavedSignatures();
  }, [loadSavedSignatures]);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name);
      setSignatureData(null);
      setSelectedSaved(null);
      setSignMode('choose');
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
  };

  const activeSignatureData = selectedSaved ? selectedSaved.data : signatureData;

  const promptSaveSignature = (data: string) => {
    Alert.alert('Save Signature', 'Save this signature for future use?', [
      { text: 'Skip', style: 'cancel' },
      {
        text: 'Save',
        onPress: () => {
          Alert.prompt(
            'Signature Name',
            'Enter a name for this signature:',
            async (name) => {
              if (name?.trim()) {
                await saveSignature(name.trim(), data);
                await loadSavedSignatures();
              }
            },
            'plain-text',
            '',
            'default'
          );
        },
      },
    ]);
  };

  const saveSignedPdf = async () => {
    if (!pdfUri || !activeSignatureData) {
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
          <img src="${activeSignatureData}" style="max-width:300px;border:1px solid #E2E8F0;border-radius:8px;" />
        </body></html>
      `;
      await savePdf(html, dest);
      Alert.alert('Success', `Signed PDF saved as ${filename}`);
      if (signMode === 'draw' && signatureData) {
        promptSaveSignature(signatureData);
      }
      setSignatureData(null);
      setSelectedSaved(null);
      signatureRef.current?.clearSignature();
    } catch {
      Alert.alert('Error', 'Failed to save signed PDF.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSig = (sig: SavedSignature) => {
    Alert.alert('Delete Signature', `Delete "${sig.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSignature(sig.id);
          await loadSavedSignatures();
          if (selectedSaved?.id === sig.id) {
            setSelectedSaved(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <TouchableOpacity style={styles.pickButton} onPress={pickPdf}>
              <Ionicons name="document-outline" size={24} color={Colors.primary} />
              <Text style={styles.pickButtonText}>
                {pdfUri ? pdfName : 'Select PDF Document'}
              </Text>
            </TouchableOpacity>

            {pdfUri && (
              <>
                <Text style={styles.sectionTitle}>Signature</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeButton, signMode === 'draw' && styles.modeButtonActive]}
                    onPress={() => {
                      setSignMode('draw');
                      setSelectedSaved(null);
                    }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color={signMode === 'draw' ? '#fff' : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.modeButtonText,
                        signMode === 'draw' && styles.modeButtonTextActive,
                      ]}
                    >
                      Draw New
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton, signMode === 'saved' && styles.modeButtonActive]}
                    onPress={() => {
                      setSignMode('saved');
                      setSignatureData(null);
                    }}
                  >
                    <Ionicons
                      name="bookmark-outline"
                      size={18}
                      color={signMode === 'saved' ? '#fff' : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.modeButtonText,
                        signMode === 'saved' && styles.modeButtonTextActive,
                      ]}
                    >
                      Saved ({savedSigs.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {signMode === 'draw' && (
                  <SignatureCanvasComponent ref={signatureRef} onSignature={handleSignature} />
                )}

                {signMode === 'saved' && (
                  <View style={styles.savedContainer}>
                    {savedSigs.length === 0 ? (
                      <View style={styles.emptySaved}>
                        <Ionicons name="bookmark-outline" size={36} color={Colors.textSecondary} />
                        <Text style={styles.emptySavedText}>No saved signatures yet</Text>
                        <Text style={styles.emptySavedSubtext}>
                          Draw a signature and save it for future use
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={savedSigs}
                        keyExtractor={(s) => s.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.savedList}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.savedCard,
                              selectedSaved?.id === item.id && styles.savedCardSelected,
                            ]}
                            onPress={() => setSelectedSaved(item)}
                            onLongPress={() => handleDeleteSig(item)}
                          >
                            <Image source={{ uri: item.data }} style={styles.savedPreview} />
                            <Text style={styles.savedName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <TouchableOpacity
                              style={styles.savedDelete}
                              onPress={() => handleDeleteSig(item)}
                            >
                              <Ionicons name="close-circle" size={16} color={Colors.danger} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    (!activeSignatureData || saving) && styles.buttonDisabled,
                  ]}
                  onPress={saveSignedPdf}
                  disabled={!activeSignatureData || saving}
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
          </View>
        }
      />
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
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  savedContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySaved: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptySavedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySavedSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  savedList: {
    gap: 10,
    paddingVertical: 4,
  },
  savedCard: {
    width: 100,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  savedCardSelected: {
    borderColor: Colors.primary,
  },
  savedPreview: {
    width: 80,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  savedName: {
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 4,
    fontWeight: '500',
    width: '100%',
    textAlign: 'center',
  },
  savedDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
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
});
