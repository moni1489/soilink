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
const layerGlyphMap: Record<LayerKey, string> = {
  soilMoisture: 'D',
  temperature: 'T',
  pH: 'pH',
  electricalConductivity: 'E',
  gasComposition: 'G',
  vibroacousticAnalysis: 'V'
};

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
      <View style={styles.segmentContainer}>
        {availableLayers.map((layer) => {
          const active = visibleLayers.includes(layer.key);
          return (
            <TouchableOpacity
              key={layer.key}
              onPress={() => onToggleLayer(layer.key)}
              style={[styles.layerButton, active ? styles.layerButtonActive : undefined]}
            >
              <View style={[styles.layerIconBadge, active ? styles.layerIconBadgeActive : undefined]}>
                <Text style={[styles.layerIconText, active ? styles.layerIconTextActive : undefined]}>
                  {layerGlyphMap[layer.key]}
                </Text>
              </View>
              <Text style={[styles.layerButtonText, active ? styles.layerButtonTextActive : undefined]}>
                {t(layer.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    padding: 24,
    backgroundColor: '#16191E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 10
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    color: '#96A2B2',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  layersHeader: {
    marginTop: 10
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#29303A',
    marginBottom: 5,
    backgroundColor: '#11151B'
  },
  buttonText: {
    color: '#DCE3EA',
    fontWeight: '500'
  },
  selected: {
    backgroundColor: 'rgba(0,245,155,0.16)',
    borderColor: '#00F59B'
  },
  segmentContainer: {
    borderWidth: 1,
    borderColor: '#28303A',
    borderRadius: 14,
    backgroundColor: '#11151B',
    padding: 4
  },
  layerButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  layerButtonActive: {
    borderColor: 'rgba(56,189,248,0.35)',
    backgroundColor: 'rgba(56,189,248,0.12)',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4
  },
  layerIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A4554',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  layerIconBadgeActive: {
    borderColor: '#9AEFD2',
    backgroundColor: 'rgba(0,245,155,0.15)'
  },
  layerIconText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#90A2B6'
  },
  layerIconTextActive: {
    color: '#D7FFEF'
  },
  layerButtonText: {
    color: '#8DA0B5',
    fontSize: 12,
    fontWeight: '600'
  },
  layerButtonTextActive: {
    color: '#E4F4FF'
  }
});
