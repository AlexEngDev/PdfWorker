import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedSignature } from '../types/signature';

const SIGNATURES_KEY = 'saved_signatures';

export async function getSavedSignatures(): Promise<SavedSignature[]> {
  const data = await AsyncStorage.getItem(SIGNATURES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as SavedSignature[];
  } catch {
    return [];
  }
}

export async function saveSignature(name: string, data: string): Promise<SavedSignature> {
  const signatures = await getSavedSignatures();
  const newSignature: SavedSignature = {
    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    data,
    createdAt: Date.now(),
  };
  signatures.push(newSignature);
  await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(signatures));
  return newSignature;
}

export async function deleteSignature(id: string): Promise<void> {
  const signatures = await getSavedSignatures();
  const filtered = signatures.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(filtered));
}
