import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { useTheme } from '../contexts/ThemeContext';
import { createPdfFromImages } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';

type ScanMode = 'camera' | 'preview' | 'saving';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<string[]>([]);
  const [mode, setMode] = useState<ScanMode>('camera');
  const cameraRef = useRef<CameraView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      setPages((prev) => [...prev, processed.uri]);
      setMode('preview');
    } catch {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const retakeLast = () => {
    setPages((prev) => prev.slice(0, -1));
    setMode('camera');
  };

  const addPage = () => {
    setMode('camera');
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setMode('camera');
      return next;
    });
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all scanned pages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setPages([]);
          setMode('camera');
        },
      },
    ]);
  };

  const savePdf = async () => {
    if (pages.length === 0) return;
    setMode('saving');
    try {
      const dir = await getPdfDirectory();
      const filename = `scan_${Date.now()}.pdf`;
      await createPdfFromImages(pages, `${dir}/${filename}`);
      Alert.alert('Success', `PDF saved as ${filename} (${pages.length} pages)`);
      setPages([]);
      setMode('camera');
    } catch {
      Alert.alert('Error', 'Failed to save PDF.');
      setMode('preview');
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="camera" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.message, { color: colors.textSecondary }]}>Camera permission is required to scan documents.</Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Animated.View style={[styles.fullFlex, { opacity: fadeAnim }]}>
        {mode === 'camera' ? (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            {pages.length > 0 && (
              <View style={[styles.pageCounter, { backgroundColor: colors.surface + 'CC', borderColor: colors.border }]}>
                <Ionicons name="documents" size={14} color="#fff" />
                <Text style={styles.pageCounterText}>
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                </Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: colors.background + '99' }]}>
              <View style={styles.captureRow}>
                {pages.length > 0 && (
                  <TouchableOpacity style={[styles.overlayButton, { backgroundColor: colors.surface + 'CC', borderColor: colors.border }]} onPress={() => setMode('preview')}>
                    <Ionicons name="images" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
                {pages.length > 0 && (
                  <TouchableOpacity style={[styles.overlayButton, { backgroundColor: colors.surface + 'CC', borderColor: colors.border }]} onPress={savePdf}>
                    <Ionicons name="checkmark" size={22} color={colors.success} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            {mode === 'saving' ? (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.savingText, { color: colors.textSecondary }]}>Saving PDF...</Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: pages[pages.length - 1] }}
                  style={styles.preview}
                  resizeMode="contain"
                />
                <Text style={[styles.previewCounter, { color: colors.textSecondary }]}>
                  Latest page · {pages.length}{' '}
                  {pages.length === 1 ? 'page' : 'pages'} scanned
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                    onPress={retakeLast}
                  >
                    <Ionicons name="refresh" size={20} color={colors.primaryLight} />
                    <Text style={[styles.buttonText, { color: colors.primaryLight }]}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={addPage}>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Add Page</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.danger }]}
                    onPress={clearAll}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.success }]} onPress={savePdf}>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Save PDF</Text>
                  </TouchableOpacity>
                </View>
                {pages.length > 0 && (
                  <FlatList
                    horizontal
                    data={pages}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.thumbnailList}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                      <View style={styles.thumbnailWrapper}>
                        <Image source={{ uri: item }} style={[styles.thumbnail, { borderColor: colors.border }]} />
                        <TouchableOpacity
                          style={[styles.thumbnailRemove, { backgroundColor: colors.surface }]}
                          onPress={() => removePage(index)}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.danger} />
                        </TouchableOpacity>
                        <View style={styles.thumbnailBadge}>
                          <Text style={[styles.thumbnailLabel, { color: colors.textSecondary }]}>{index + 1}</Text>
                        </View>
                      </View>
                    )}
                  />
                )}
              </>
            )}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullFlex: {
    flex: 1,
    width: '100%',
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  permissionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  pageCounterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  overlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    padding: 16,
  },
  preview: {
    flex: 1,
    borderRadius: 16,
  },
  previewCounter: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  savingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  savingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
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
  thumbnailList: {
    paddingTop: 14,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 12,
  },
  thumbnailBadge: {
    alignItems: 'center',
    marginTop: 4,
  },
  thumbnailLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
});
