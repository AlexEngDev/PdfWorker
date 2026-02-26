import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

/**
 * Requests camera permission and returns whether it was granted.
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Requests media library permission and returns whether it was granted.
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}
