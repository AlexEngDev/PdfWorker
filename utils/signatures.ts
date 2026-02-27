import AsyncStorage from '@react-native-async-storage/async-storage';

const SIGNATURES_KEY = 'saved_signatures';

export type SavedSignature = {
  id: string;
  name: string;
  data: string; // base64 image data URI
  createdAt: number;
};

export async function getSavedSignatures(): Promise<SavedSignature[]> {
  const json = await AsyncStorage.getItem(SIGNATURES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveSignature(name: string, data: string): Promise<SavedSignature> {
  const signatures = await getSavedSignatures();
  const newSig: SavedSignature = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, name, data, createdAt: Date.now() };
  signatures.push(newSig);
  await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(signatures));
  return newSig;
}

export async function deleteSignature(id: string): Promise<void> {
  const signatures = await getSavedSignatures();
  const updated = signatures.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(updated));
}
