import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function SignScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef<{ clearSignature: () => void }>(null);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name);
      setSignatureData(null);
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
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

        {pdfUri && (
          <>
            <Text style={styles.sectionTitle}>Draw Signature</Text>
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
