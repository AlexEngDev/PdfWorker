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

type Mode = 'camera' | 'preview' | 'saving';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('camera');
  const [saving, setSaving] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
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
      setPages((prev) => {
        const next = [...prev, processed.uri];
        setPreviewIndex(next.length - 1);
        return next;
      });
      setMode('preview');
    } catch {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const retakeLast = () => {
    setPages((prev) => prev.slice(0, -1));
    setMode('camera');
  };

  const clearAll = () => {
    setPages([]);
    setMode('camera');
  };

  const savePdf = async () => {
    if (pages.length === 0) return;
    setSaving(true);
    setMode('saving');
    try {
      const dir = await getPdfDirectory();
      const filename = `scan_${Date.now()}.pdf`;
      await createPdfFromImages(pages, `${dir}/${filename}`);
      Alert.alert('Success', `PDF saved as ${filename}`);
      setPages([]);
      setMode('camera');
    } catch {
      Alert.alert('Error', 'Failed to save PDF.');
      setMode('preview');
    } finally {
      setSaving(false);
    }
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setMode('camera');
      } else {
        setPreviewIndex(Math.min(previewIndex, next.length - 1));
      }
      return next;
    });
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

  if (mode === 'camera') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          {pages.length > 0 && (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{pages.length} page{pages.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
          <View style={styles.cameraActions}>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // preview or saving mode
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.previewContainer}>
        <Text style={styles.pageCounter}>{pages.length} page{pages.length !== 1 ? 's' : ''} scanned</Text>

        <Image
          source={{ uri: pages[previewIndex] }}
          style={styles.preview}
          resizeMode="contain"
        />

        {/* Thumbnail strip */}
        <FlatList
          data={pages}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          style={styles.thumbnailList}
          contentContainerStyle={styles.thumbnailContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => setPreviewIndex(index)}
              style={[
                styles.thumbnailWrapper,
                index === previewIndex && styles.thumbnailSelected,
              ]}
            >
              <Image source={{ uri: item }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.thumbnailRemove}
                onPress={() => removePage(index)}
              >
                <Ionicons name="close-circle" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setMode('camera')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Add Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={retakeLast}
          >
            <Ionicons name="camera-outline" size={20} color={Colors.primary} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retake</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearAll}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            <Text style={[styles.buttonText, styles.dangerButtonText]}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={savePdf}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Save PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  pageBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraActions: {
    position: 'absolute',
    bottom: 32,
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
  previewContainer: {
    flex: 1,
    width: '100%',
    padding: 16,
    gap: 12,
  },
  pageCounter: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  preview: {
    flex: 1,
    borderRadius: 12,
  },
  thumbnailList: {
    flexGrow: 0,
  },
  thumbnailContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: Colors.primary,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.card,
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
  dangerButton: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    color: Colors.danger,
  },
});
