import { useEffect, useRef, useState } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { createPdfFromImages } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';

type ScanState = 'camera' | 'preview' | 'saving';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<string[]>([]);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>('camera');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo) return;
      const processed = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: SaveFormat.JPEG }
      );
      setLastPhoto(processed.uri);
      setScanState('preview');
    } catch {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const addPage = () => {
    if (!lastPhoto) return;
    setPages((prev) => [...prev, lastPhoto]);
    setLastPhoto(null);
    setScanState('camera');
  };

  const retake = () => {
    setLastPhoto(null);
    setScanState('camera');
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all scanned pages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setPages([]);
          setLastPhoto(null);
          setScanState('camera');
        },
      },
    ]);
  };

  const savePdf = async () => {
    const allPages = lastPhoto ? [...pages, lastPhoto] : pages;
    if (allPages.length === 0) return;
    setScanState('saving');
    try {
      const dir = await getPdfDirectory();
      const filename = `scan_${Date.now()}.pdf`;
      await createPdfFromImages(allPages, `${dir}/${filename}`);
      Alert.alert(
        'Success',
        `PDF saved as ${filename} (${allPages.length} page${allPages.length > 1 ? 's' : ''})`
      );
      setPages([]);
      setLastPhoto(null);
      setScanState('camera');
    } catch {
      Alert.alert('Error', 'Failed to save PDF.');
      setScanState(lastPhoto ? 'preview' : 'camera');
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan documents.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanState === 'saving') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.message}>Saving PDF…</Text>
      </SafeAreaView>
    );
  }

  const totalPages = pages.length + (lastPhoto ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {scanState === 'camera' ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          {pages.length > 0 && (
            <View style={styles.pageCounter}>
              <Text style={styles.pageCounterText}>
                {pages.length} page{pages.length !== 1 ? 's' : ''} scanned
              </Text>
            </View>
          )}
          <View style={styles.cameraActions}>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
          {pages.length > 0 && (
            <View style={styles.thumbnailBar}>
              <FlatList
                data={pages}
                keyExtractor={(_, i) => String(i)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
                renderItem={({ item, index }) => (
                  <View style={styles.thumbnailWrapper}>
                    <Image source={{ uri: item }} style={styles.thumbnail} />
                    <TouchableOpacity
                      style={styles.thumbnailRemove}
                      onPress={() => removePage(index)}
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                    <Text style={styles.thumbnailIndex}>{index + 1}</Text>
                  </View>
                )}
              />
              <View style={styles.thumbnailBarActions}>
                <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={savePdf}>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              Page {totalPages} of {totalPages}
            </Text>
          </View>
          <Image source={{ uri: lastPhoto! }} style={styles.preview} resizeMode="contain" />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={retake}>
              <Ionicons name="camera-outline" size={20} color={Colors.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={addPage}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Add Page</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={savePdf}>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
    marginTop: 12,
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  pageCounter: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pageCounterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cameraActions: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: Colors.primary,
    borderRadius: 40,
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  thumbnailBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
  },
  thumbnailList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnail: {
    width: 64,
    height: 80,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  thumbnailIndex: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  thumbnailBarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearButtonText: {
    color: Colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    padding: 16,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  preview: {
    flex: 1,
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
});
