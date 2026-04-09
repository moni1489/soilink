import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Field, LayerKey } from '../types';
import { useTranslation } from 'react-i18next';

const availableLayers: { key: LayerKey; label: string }[] = [
  { key: 'soilMoisture', label: 'soilMoisture' },
  { key: 'temperature', label: 'temperature' },
  { key: 'pH', label: 'pH' },
  { key: 'electricalConductivity', label: 'electricalConductivity' },
  { key: 'gasComposition', label: 'gasComposition' },
  { key: 'soilGrids', label: 'soilGrids' }
];

const layerGlyphMap: Record<LayerKey, string> = {
  soilMoisture: '💧',
  temperature: '🌡️',
  pH: '🧪',
  electricalConductivity: '⚡',
  gasComposition: '💨',
  soilGrids: '🌍'
};

interface Props {
  fields: Field[];
  selectedFieldId: string;
  onSelectField: (id: string) => void;
  visibleLayers: LayerKey[];
  onToggleLayer: (layer: LayerKey) => void;
  onOpenAI: () => void;
  onRegisterOpen: () => void;
}

export default function Sidebar({
  fields,
  selectedFieldId,
  onSelectField,
  visibleLayers,
  onToggleLayer,
  onOpenAI,
  onRegisterOpen
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SoiLink</Text>
        <View style={styles.logoDot} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('field')}</Text>
          <Pressable onPress={onRegisterOpen}>
             <Text style={styles.addBtn}>+</Text>
          </Pressable>
        </View>
        {fields.map((field) => {
          const isActive = field.id === selectedFieldId;
          return (
            <Pressable
              key={field.id}
              onPress={() => onSelectField(field.id)}
              style={[styles.fieldItem, isActive && styles.layerItemActive]}
            >
              <Text style={[styles.layerLabel, isActive && styles.layerLabelActive]}>
                {field.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('mapLayers')}</Text>
        {availableLayers.map((layer) => {
          const isActive = visibleLayers.includes(layer.key);
          return (
            <Pressable
              key={layer.key}
              onPress={() => onToggleLayer(layer.key)}
              style={[styles.layerItem, isActive && styles.layerItemActive]}
            >
              <View style={styles.layerLeft}>
                <Text style={styles.layerIcon}>{layerGlyphMap[layer.key] || '📍'}</Text>
                <Text style={[styles.layerLabel, isActive && styles.layerLabelActive]}>
                  {t(layer.label)}
                </Text>
              </View>
              <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                {isActive && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable 
          style={styles.aiButton}
          onPress={onOpenAI}
        >
          <Text style={styles.aiButtonText}>AI Agronomist</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: '#0A0F14',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 245, 155, 0.12)',
    paddingVertical: 24,
    paddingHorizontal: 20,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    gap: 8
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F59B',
    marginTop: 8
  },
  section: {
    marginBottom: 40
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingLeft: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  addBtn: {
    color: '#00F59B',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 8
  },
  fieldItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  layerItemActive: {
    backgroundColor: 'rgba(0, 245, 155, 0.08)',
    borderColor: 'rgba(0, 245, 155, 0.2)'
  },
  layerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  layerIcon: {
    fontSize: 18
  },
  layerLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500'
  },
  layerLabelActive: {
    color: '#00F59B',
    fontWeight: '700'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#00F59B',
    borderColor: '#00F59B'
  },
  checkMark: {
    color: '#0A0F14',
    fontSize: 12,
    fontWeight: '900'
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  aiButton: {
    backgroundColor: '#00F59B',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F59B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8
  },
  aiButtonText: {
    color: '#0A0F14',
    fontSize: 16,
    fontWeight: '800'
  }
});
