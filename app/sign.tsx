import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
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
import { Colors } from '../constants/colors';
import SignatureCanvasComponent from '../components/SignatureCanvas';
import { savePdf } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';
import {
  deleteSignature,
  getSavedSignatures,
  saveSignature,
  type SavedSignature,
} from '../utils/signatures';

type SignatureMode = 'draw' | 'saved';

export default function SignScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [selectedSavedSig, setSelectedSavedSig] = useState<SavedSignature | null>(null);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const signatureRef = useRef<{ clearSignature: () => void }>(null);

  useEffect(() => {
    getSavedSignatures()
      .then(setSavedSignatures)
      .catch(() => Alert.alert('Error', 'Failed to load saved signatures.'));
  }, []);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name);
      setSignatureData(null);
      setSelectedSavedSig(null);
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
    setSelectedSavedSig(null);
  };

  const selectSavedSig = (sig: SavedSignature) => {
    setSelectedSavedSig(sig);
    setSignatureData(sig.data);
  };

  const confirmDeleteSignature = (sig: SavedSignature) => {
    Alert.alert('Delete Signature', `Delete "${sig.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSignature(sig.id);
            const updated = await getSavedSignatures();
            setSavedSignatures(updated);
            if (selectedSavedSig?.id === sig.id) {
              setSelectedSavedSig(null);
              setSignatureData(null);
            }
          } catch {
            Alert.alert('Error', 'Failed to delete signature.');
          }
        },
      },
    ]);
  };

  const promptSaveName = (data: string) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Save Signature',
        'Enter a name for this signature:',
        async (name) => {
          if (name?.trim()) {
            try {
              await saveSignature(name.trim(), data);
              const updated = await getSavedSignatures();
              setSavedSignatures(updated);
            } catch {
              Alert.alert('Error', 'Failed to save signature.');
            }
          }
        },
        'plain-text'
      );
    } else {
      setSaveNameInput('');
      setShowSaveInput(true);
    }
  };

  const confirmSaveName = async () => {
    const name = saveNameInput.trim();
    if (!name || !signatureData) return;
    setShowSaveInput(false);
    try {
      await saveSignature(name, signatureData);
      const updated = await getSavedSignatures();
      setSavedSignatures(updated);
    } catch {
      Alert.alert('Error', 'Failed to save signature.');
    }
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

      const currentSigData = signatureData;
      Alert.alert('Success', `Signed PDF saved as ${filename}`, [
        {
          text: 'Save Signature',
          onPress: () => promptSaveName(currentSigData),
        },
        { text: 'Skip', style: 'cancel' },
      ]);

      setSignatureData(null);
      setSelectedSavedSig(null);
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

        {pdfUri && (
          <>
            {/* Mode tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, signatureMode === 'draw' && styles.tabActive]}
                onPress={() => setSignatureMode('draw')}
              >
                <Text style={[styles.tabText, signatureMode === 'draw' && styles.tabTextActive]}>
                  Draw New
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, signatureMode === 'saved' && styles.tabActive]}
                onPress={() => setSignatureMode('saved')}
              >
                <Text style={[styles.tabText, signatureMode === 'saved' && styles.tabTextActive]}>
                  Saved ({savedSignatures.length})
                </Text>
              </TouchableOpacity>
            </View>

            {signatureMode === 'draw' ? (
              <>
                <Text style={styles.sectionTitle}>Draw Signature</Text>
                <SignatureCanvasComponent
                  ref={signatureRef}
                  onSignature={handleSignature}
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Use Saved Signature</Text>
                {savedSignatures.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No saved signatures yet.</Text>
                    <Text style={styles.emptySubtext}>
                      Draw a signature and save it for future use.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={savedSignatures}
                    keyExtractor={(item) => item.id}
                    horizontal
                    scrollEnabled
                    style={styles.savedList}
                    contentContainerStyle={styles.savedListContent}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectSavedSig(item)}
                        onLongPress={() => confirmDeleteSignature(item)}
                        style={[
                          styles.sigCard,
                          selectedSavedSig?.id === item.id && styles.sigCardSelected,
                        ]}
                      >
                        <Image
                          source={{ uri: item.data }}
                          style={styles.sigPreview}
                          resizeMode="contain"
                        />
                        <Text style={styles.sigName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <TouchableOpacity
                          style={styles.sigDelete}
                          onPress={() => confirmDeleteSignature(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            )}

            {/* Android inline name input */}
            {showSaveInput && (
              <View style={styles.saveInputRow}>
                <TextInput
                  style={styles.saveInput}
                  value={saveNameInput}
                  onChangeText={setSaveNameInput}
                  placeholder="Signature name"
                  placeholderTextColor={Colors.textSecondary}
                  autoFocus
                />
                <TouchableOpacity style={styles.saveInputButton} onPress={confirmSaveName}>
                  <Text style={styles.saveInputButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveInputButton, styles.saveInputCancel]}
                  onPress={() => setShowSaveInput(false)}
                >
                  <Text style={[styles.saveInputButtonText, styles.saveInputCancelText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  savedList: {
    flexGrow: 0,
  },
  savedListContent: {
    gap: 10,
  },
  sigCard: {
    width: 110,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sigCardSelected: {
    borderColor: Colors.primary,
  },
  sigPreview: {
    width: 80,
    height: 50,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  sigName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  sigDelete: {
    marginTop: 6,
  },
  saveInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  saveInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveInputButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveInputButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  saveInputCancel: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveInputCancelText: {
    color: Colors.textPrimary,
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
