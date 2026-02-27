import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import type { PdfFile } from '../types/pdf';
import { getFileSize } from '../utils/fileSystem';

type Props = {
  file: PdfFile;
  onShare: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
  onView?: () => void;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DocumentCard({ file, onShare, onDelete, onRename, onView }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const startEditing = () => {
    const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
    setEditName(nameWithoutExt);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditName('');
  };

  const saveEditing = () => {
    const trimmed = editName.trim();
    if (trimmed && onRename) {
      onRename(trimmed);
    }
    setEditing(false);
    setEditName('');
  };

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="document-text" size={28} color={Colors.danger} />
        </View>
        <View style={styles.info}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                selectTextOnFocus
                placeholder="File name"
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable style={styles.editButton} onPress={saveEditing}>
                <Ionicons name="checkmark" size={18} color={Colors.success} />
              </Pressable>
              <Pressable style={styles.editButton} onPress={cancelEditing}>
                <Ionicons name="close" size={18} color={Colors.danger} />
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.name} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.meta}>
                {formatDate(file.modificationTime)} · {getFileSize(file.size)}
              </Text>
            </>
          )}
        </View>
        {!editing && (
          <View style={styles.actions}>
            {onView && (
              <Pressable style={styles.actionButton} onPress={onView}>
                <Ionicons name="eye-outline" size={20} color={Colors.accent} />
              </Pressable>
            )}
            {onRename && (
              <Pressable style={styles.actionButton} onPress={startEditing}>
                <Ionicons name="pencil-outline" size={20} color={Colors.warning} />
              </Pressable>
            )}
            <Pressable style={styles.actionButton} onPress={onShare}>
              <Ionicons name="share-outline" size={20} color={Colors.primaryLight} />
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.danger + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
  },
});
