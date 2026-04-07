import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteNote, getNote, updateDescription } from '../db';
import type { RootStackParamList } from '../navigation';
import type { PhotoNote } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

function formatTitle(createdAt: number): string {
  return new Date(createdAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export function DetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [note, setNote] = useState<PhotoNote | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const n = await getNote(id);
      setNote(n);
      if (n) setDescription(n.description);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!note) return;
    setSaving(true);
    try {
      await updateDescription(note.id, description);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function onDelete() {
    Alert.alert('Delete photo note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteNote(id);
            navigation.navigate('Timeline');
          })();
        },
      },
    ]);
  }

  if (loading || !note) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: note.localUri }} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{formatTitle(note.createdAt)}</Text>
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Optional notes…"
        placeholderTextColor="#999"
        value={description}
        onChangeText={setDescription}
      />
      <Pressable
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={() => void onSave()}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save description'}</Text>
      </Pressable>
      <Pressable style={styles.dangerButton} onPress={onDelete}>
        <Text style={styles.dangerButtonText}>Delete</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#eee',
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dangerButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 16,
  },
});
