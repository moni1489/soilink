import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)/map");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Добро пожаловать в Soilink</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#868686ff"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#868686ff"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Войти</Text>
        </TouchableOpacity>

        {/* <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Not a member?</Text>
          <TouchableOpacity onPress={() => router.push("/auth/register")}>
            <Text style={styles.signupButton}> Create account</Text>
          </TouchableOpacity>
        </View> */ } it's a registration transition but it unlikely to be used later due to we don't need it
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", padding: 20 },
  formContainer: { width: "100%" },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#222", color: "#fff", padding: 14, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: "#96ff", padding: 16, borderRadius: 8, alignItems: "center", marginBottom: 20 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  signupContainer: { flexDirection: "row", justifyContent: "center" },
  signupText: { color: "#888" },
  signupButton: { color: "#96ff", fontWeight: "bold" },
});
