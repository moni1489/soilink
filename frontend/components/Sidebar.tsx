
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Field, LayerKey } from '../types';
import { useTranslation } from 'react-i18next';

const availableLayers: { key: LayerKey; label: string }[] = [
  { key: 'soilMoisture', label: 'soilMoisture' },
  { key: 'temperature', label: 'temperature' },
  { key: 'pH', label: 'pH' },
  { key: 'electricalConductivity', label: 'electricalConductivity' },
  { key: 'gasComposition', label: 'gasComposition' },
  { key: 'vibroacousticAnalysis', label: 'vibroacousticAnalysis' }
];

interface Props {
  fields: Field[];
  selectedFieldId: string;
  onSelectField: (id: string) => void;
  visibleLayers: LayerKey[];
  onToggleLayer: (layer: LayerKey) => void;
}

export default function Sidebar({ fields, selectedFieldId, onSelectField, visibleLayers, onToggleLayer }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('field')}</Text>
      {fields.map((field) => (
        <TouchableOpacity key={field.id} onPress={() => onSelectField(field.id)} style={[styles.button, selectedFieldId === field.id ? styles.selected : null]}>
          <Text>{field.name}</Text>
        </TouchableOpacity>
      ))}
      <Text style={[styles.header, { marginTop: 12 }]}>{t('layers')}</Text>
      {availableLayers.map((layer) => {
        const active = visibleLayers.includes(layer.key);
        return (
          <TouchableOpacity key={layer.key} onPress={() => onToggleLayer(layer.key)} style={[styles.button, active ? styles.selected : null]}>
            <Text>{t(layer.label)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8
  },
  header: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 5
  },
  selected: {
    backgroundColor: '#e5f4ff',
    borderColor: '#80c9ff'
  }
});
