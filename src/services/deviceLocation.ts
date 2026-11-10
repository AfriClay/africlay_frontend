import { Platform } from 'react-native';

export type DeviceCoordinates = { latitude: number; longitude: number; accuracy_meters: number };

function verifiedCoordinates(latitude: number, longitude: number, accuracy: number | null): DeviceCoordinates {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90
      || longitude < -180 || longitude > 180 || accuracy === null || !Number.isFinite(accuracy)
      || accuracy <= 0 || accuracy > 250) {
    throw new Error('Your location is not accurate enough for delivery. Search for a building or landmark instead.');
  }
  return { latitude, longitude, accuracy_meters: accuracy };
}

export async function getDeviceCoordinates(): Promise<DeviceCoordinates> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Location is unavailable in this browser. Search for a building or landmark instead.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          try {
            resolve(verifiedCoordinates(position.coords.latitude, position.coords.longitude, position.coords.accuracy));
          } catch (error) { reject(error); }
        },
        error => reject(new Error(error.code === 1
          ? 'Location access was denied. Allow it in your browser or search for a building instead.'
          : 'Could not get your location. Search for a building or landmark instead.')),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
      );
    });
  }
  const Location = await import('expo-location');
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Location access was denied. Allow it in device settings or search for a building instead.');
  }
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return verifiedCoordinates(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Your location is not accurate')) throw error;
    throw new Error('Could not get your location. Search for a building or landmark instead.');
  }
}
