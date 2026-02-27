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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { createPdfFromImages } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';

export default function ConvertScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((u) => u !== uri));
  };

  const convertToPdf = async () => {
    if (images.length === 0) {
      Alert.alert('No images', 'Please select at least one image.');
      return;
    }
    setConverting(true);
    try {
      const dir = await getPdfDirectory();
      const filename = `converted_${Date.now()}.pdf`;
      await createPdfFromImages(images, `${dir}/${filename}`);
      Alert.alert('Success', `PDF saved as ${filename}`);
      setImages([]);
    } catch {
      Alert.alert('Error', 'Failed to convert images to PDF.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
          <View style={styles.pickIconWrapper}>
            <Ionicons name="images" size={22} color={Colors.accent} />
          </View>
          <View style={styles.pickTextWrapper}>
            <Text style={styles.pickButtonTitle}>Add Images</Text>
            <Text style={styles.pickButtonSubtext}>Select photos from gallery</Text>
          </View>
          <Ionicons name="add-circle" size={24} color={Colors.accent} />
        </TouchableOpacity>

        {images.length > 0 && (
          <View style={styles.countBadge}>
            <Ionicons name="images" size={14} color={Colors.primaryLight} />
            <Text style={styles.countText}>{images.length} image(s) selected</Text>
          </View>
        )}

        <FlatList
          data={images}
          keyExtractor={(item) => item}
          numColumns={3}
          contentContainerStyle={styles.imageGrid}
          renderItem={({ item }) => (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(item)}
              >
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          style={styles.list}
        />

        <TouchableOpacity
          style={[styles.button, (images.length === 0 || converting) && styles.buttonDisabled]}
          onPress={convertToPdf}
          disabled={images.length === 0 || converting}
        >
          {converting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.buttonText}>Convert to PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
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
    backgroundColor: Colors.accent + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickTextWrapper: {
    flex: 1,
  },
  pickButtonTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  pickButtonSubtext: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  countText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  imageGrid: {
    gap: 8,
  },
  imageWrapper: {
    flex: 1,
    margin: 4,
    position: 'relative',
    aspectRatio: 1,
    maxWidth: '31%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
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
});
