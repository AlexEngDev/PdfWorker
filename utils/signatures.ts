import AsyncStorage from '@react-native-async-storage/async-storage';

const SIGNATURES_KEY = 'saved_signatures';

export type SavedSignature = {
  id: string;
  name: string;
  data: string; // base64 image data URI
  createdAt: number;
};

export async function getSavedSignatures(): Promise<SavedSignature[]> {
  const raw = await AsyncStorage.getItem(SIGNATURES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as SavedSignature[];
}

export async function saveSignature(name: string, data: string): Promise<SavedSignature> {
  const signatures = await getSavedSignatures();
  const newSig: SavedSignature = {
    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    name,
    data,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify([...signatures, newSig]));
  return newSig;
}

export async function deleteSignature(id: string): Promise<void> {
  const signatures = await getSavedSignatures();
  await AsyncStorage.setItem(
    SIGNATURES_KEY,
    JSON.stringify(signatures.filter((s) => s.id !== id))
  );
}
