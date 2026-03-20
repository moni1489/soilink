import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../../firebase";

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/auth/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Настройки</Text>
      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, marginBottom: 30 },
  logoutButton: { backgroundColor: "red", padding: 10, borderRadius: 8 },
  logoutText: { color: "white", fontWeight: "bold" },
});
