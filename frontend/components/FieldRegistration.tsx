import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, ActivityIndicator } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FieldRegistration({ visible, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !lat || !lon) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          area_hectares: 10 // default
        }),
      });

      if (!response.ok) throw new Error('Ошибка при регистрации');
      
      onSuccess();
      onClose();
    } catch (err) {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Регистрация поля</Text>
          <Text style={styles.subtitle}>Введите координаты для ISRIC SoilGrids</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Название</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Напр. Северный участок" 
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.coordRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Широта (Lat)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="51.5074" 
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={lat}
                onChangeText={setLat}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Долгота (Lon)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="-0.1278" 
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={lon}
                onChangeText={setLon}
              />
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.btnRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </Pressable>
            <Pressable style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#0A0F14" /> : <Text style={styles.submitBtnText}>Создать</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0A0F14',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,245,155,0.2)'
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  coordRow: { flexDirection: 'row', gap: 16 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 54,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 16
  },
  errorText: { color: '#FF4D4D', marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  submitBtn: { flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00F59B' },
  submitBtnText: { color: '#0A0F14', fontWeight: '900', fontSize: 16 }
});
