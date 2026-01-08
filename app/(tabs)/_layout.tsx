import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="map"
        options={{ 
          title: "Карта",
          tabBarLabel: "Карта",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ 
          title: "Настройки",
          tabBarLabel: "Настройки",
        }}
      />
    </Tabs>
  );
}
