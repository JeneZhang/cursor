import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CameraScreen } from './screens/CameraScreen';
import { DetailScreen } from './screens/DetailScreen';
import { TimelineScreen } from './screens/TimelineScreen';

export type RootStackParamList = {
  Timeline: undefined;
  Camera: undefined;
  Detail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.headerBtn}>
      <Text style={styles.headerBtnText}>{label}</Text>
    </Pressable>
  );
}

export function RootNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Timeline"
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Timeline"
          component={TimelineScreen}
          options={({ navigation }) => ({
            title: 'Photo notes',
            headerRight: () => (
              <HeaderTextButton label="Capture" onPress={() => navigation.navigate('Camera')} />
            ),
          })}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ title: 'Capture', presentation: 'modal' }}
        />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Note' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  headerBtnText: {
    color: '#2563eb',
    fontSize: 17,
    fontWeight: '600',
  },
});
