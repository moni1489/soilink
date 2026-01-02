import React from "react";
import { StyleSheet, View } from "react-native";
import Login from "./app/auth/login";

export default function App() {
  return (
    <View style={styles.container}>
      <Login />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
