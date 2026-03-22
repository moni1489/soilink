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

export default function Sidebar({
  fields,
  selectedFieldId,
  onSelectField,
  visibleLayers,
  onToggleLayer
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('field')}</Text>
      {fields.map((field) => (
        <TouchableOpacity
          key={field.id}
          onPress={() => onSelectField(field.id)}
          style={[styles.button, selectedFieldId === field.id ? styles.selected : undefined]}
        >
          <Text style={styles.buttonText}>{field.name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.header, styles.layersHeader]}>{t('layers')}</Text>
      {availableLayers.map((layer) => {
        const active = visibleLayers.includes(layer.key);

        return (
          <TouchableOpacity
            key={layer.key}
            onPress={() => onToggleLayer(layer.key)}
            style={[styles.button, active ? styles.selected : undefined]}
          >
            <Text style={styles.buttonText}>{t(layer.label)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    padding: 12,
    backgroundColor: '#f4fbf2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b7d4b1',
    gap: 8
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4d2a',
    marginBottom: 4
  },
  layersHeader: {
    marginTop: 10
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0e3cb',
    marginBottom: 5,
    backgroundColor: '#ffffff'
  },
  buttonText: {
    color: '#2f4f37',
    fontWeight: '500'
  },
  selected: {
    backgroundColor: '#dcf4dd',
    borderColor: '#63a46c'
  }
});
