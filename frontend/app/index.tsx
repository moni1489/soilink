import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { fields, zones, sensors, statistics, recommendations } from '../data/mockData';
import TopCards from '../components/TopCards';
import Sidebar from '../components/Sidebar';
import FieldMap from '../components/FieldMap';
import Recommendations from '../components/Recommendations';
import SensorModal from '../components/SensorModal';
import { LayerKey, Sensor, MapMode } from '../types';
import { useLocale } from '../hooks/useLocale';

const defaultVisible: LayerKey[] = ['soilMoisture', 'temperature', 'pH', 'electricalConductivity', 'gasComposition', 'vibroacousticAnalysis'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { locale, setLanguage } = useLocale();
  const [activeFieldId, setActiveFieldId] = useState(fields[0].id);
  const [visibleLayers, setVisibleLayers] = useState<LayerKey[]>(defaultVisible);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('zones');

  const activeField = fields.find((f) => f.id === activeFieldId) ?? fields[0];

  const onSelectSensor = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setSensorModalVisible(true);
  };

  const onToggleLayer = (layer: LayerKey) => {
    setVisibleLayers((previous) =>
      previous.includes(layer) ? previous.filter((item) => item !== layer) : [...previous, layer]
    );
  };

  const languageButtons = [
    { code: 'en', label: t('english') },
    { code: 'ru', label: t('russian') },
    { code: 'kk', label: t('kazakh') }
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.contentContainer}>
      <View style={styles.localeRow}>
        <Text style={styles.localeLabel}>{t('chooseLanguage')}:</Text>
        {languageButtons.map((item) => (
          <TouchableOpacity key={item.code} style={[styles.langButton, locale === item.code ? styles.langActive : undefined]} onPress={() => setLanguage(item.code)}>
            <Text>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('topSummary')}</Text>
      <TopCards stats={statistics} />

      {Platform.OS === 'web' ? (
        <View style={styles.webLayout}>
          <Sidebar fields={fields} selectedFieldId={activeFieldId} onSelectField={setActiveFieldId} visibleLayers={visibleLayers} onToggleLayer={onToggleLayer} />
          <View style={styles.mapRegion}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapLabel}>{t('map')}</Text>
              <View style={styles.mapModeGroup}>
                <Text style={styles.mapModeLabel}>{t('mapMode')}:</Text>
                <TouchableOpacity style={[styles.mapModeButton, mapMode === 'zones' ? styles.mapModeButtonActive : undefined]} onPress={() => setMapMode('zones')}>
                  <Text>{t('zonesView')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapModeButton, mapMode === 'heatmap' ? styles.mapModeButtonActive : undefined]} onPress={() => setMapMode('heatmap')}>
                  <Text>{t('heatmapView')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FieldMap fieldCenter={activeField.center} zones={zones} sensors={sensors} onSelectSensor={onSelectSensor} visibleLayers={visibleLayers} mapMode={mapMode} />
          </View>
          <Recommendations recommendations={recommendations} />
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapLabel}>{t('map')}</Text>
            <View style={styles.mapModeGroup}>
              <Text style={styles.mapModeLabel}>{t('mapMode')}:</Text>
              <TouchableOpacity style={[styles.mapModeButton, mapMode === 'zones' ? styles.mapModeButtonActive : undefined]} onPress={() => setMapMode('zones')}>
                <Text>{t('zonesView')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mapModeButton, mapMode === 'heatmap' ? styles.mapModeButtonActive : undefined]} onPress={() => setMapMode('heatmap')}>
                <Text>{t('heatmapView')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FieldMap fieldCenter={activeField.center} zones={zones} sensors={sensors} onSelectSensor={onSelectSensor} visibleLayers={visibleLayers} mapMode={mapMode} />
          <Sidebar fields={fields} selectedFieldId={activeFieldId} onSelectField={setActiveFieldId} visibleLayers={visibleLayers} onToggleLayer={onToggleLayer} />
          <Recommendations recommendations={recommendations} />
        </View>
      )}

      <SensorModal visible={sensorModalVisible} sensor={selectedSensor} onClose={() => setSensorModalVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  contentContainer: { padding: 12, paddingBottom: 80 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  localeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  localeLabel: { fontWeight: '600', marginRight: 8 },
  langButton: { borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, marginRight: 8, marginBottom: 6 },
  langActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  webLayout: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mobileLayout: {
    gap: 10
  },
  mapRegion: { flex: 1, minHeight: 460 },
  mapHeaderRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  mapLabel: { fontWeight: '700' },
  mapModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  mapModeLabel: {
    fontSize: 12,
    color: '#374151',
    marginRight: 6
  },
  mapModeButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6
  },
  mapModeButtonActive: {
    borderColor: '#0f766e',
    backgroundColor: '#ccfbf1'
  }
});
