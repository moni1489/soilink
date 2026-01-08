import { Platform, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { darkMapStyle } from "../styles/darkMapStyle";

export default function MapScreen() {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Карта пока не поддерживается на web 😅</Text>
      </View>
    );
  }

  return (
    <MapView
      style={{ flex: 1 }}
      customMapStyle={darkMapStyle}
      initialRegion={{
        latitude: 43.238949,
        longitude: 76.889709,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={{ latitude: 43.24, longitude: 76.90 }} title="Датчик #1" />
    </MapView>
  );
}
