import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { insertNote } from '../db';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function CameraScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera access is needed to capture photo notes.</Text>
        {Platform.OS === 'web' ? (
          <Text style={styles.hint}>
            After you tap below, your browser will ask again — choose Allow. If the camera never
            starts, open this page in a full browser tab (not a small preview), or use Expo Go on
            your phone.
          </Text>
        ) : null}
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  async function onCapture() {
    if (!cameraRef.current || saving) return;
    setSaving(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      const id = newId();
      let dest: string;
      if (Platform.OS === 'web') {
        dest = photo.uri;
      } else {
        const notesDir = new Directory(Paths.document, 'notes');
        notesDir.create({ intermediates: true, idempotent: true });
        const destFile = new File(notesDir, `${id}.jpg`);
        const sourceFile = new File(photo.uri);
        sourceFile.copy(destFile);
        dest = destFile.uri;
      }
      const createdAt = Date.now();
      await insertNote({
        id,
        createdAt,
        localUri: dest,
        description: '',
      });
      navigation.navigate('Timeline');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.controls}>
        <Pressable
          style={[styles.shutter, saving && styles.shutterDisabled]}
          onPress={() => void onCapture()}
          disabled={!ready || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 340,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
