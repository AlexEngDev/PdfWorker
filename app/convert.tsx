import { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { createPdfFromImages } from '../utils/pdf';
import { getPdfDirectory } from '../utils/fileSystem';

export default function ConvertScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);

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
      <View style={styles.content}>
        <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
          <Ionicons name="images-outline" size={24} color={Colors.primary} />
          <Text style={styles.pickButtonText}>Add Images</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <Text style={styles.countText}>{images.length} image(s) selected</Text>
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
                <Ionicons name="close-circle" size={20} color={Colors.danger} />
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
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Convert to PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  },
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.card,
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
