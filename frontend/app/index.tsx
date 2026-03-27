import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { fields, zones, sensors, statistics, recommendations } from '../data/mockData';
import TopCards from '../components/TopCards';
import Sidebar from '../components/Sidebar';
import FieldMap from '../components/FieldMap';
import Recommendations from '../components/Recommendations';
import SensorModal from '../components/SensorModal';
import ZoneModal from '../components/ZoneModal';
import { LayerKey, Sensor, SoilZone, MapMode } from '../types';
import { useLocale } from '../hooks/useLocale';

const defaultVisible: LayerKey[] = [
  'soilMoisture',
  'temperature',
  'pH',
  'electricalConductivity',
  'gasComposition',
  'vibroacousticAnalysis'
];

const getStatusHealthScore = (status: Sensor['status']) => {
  if (status === 'healthy') return 95;
  if (status === 'warning') return 66;
  return 34;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { locale, setLanguage } = useLocale();
  const [activeFieldId, setActiveFieldId] = useState(fields[0].id);
  const [visibleLayers, setVisibleLayers] = useState<LayerKey[]>(defaultVisible);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState<SoilZone | null>(null);
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('zones');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const activeField = useMemo(
    () => fields.find((field) => field.id === activeFieldId) ?? fields[0],
    [activeFieldId]
  );

  const activeSensors = useMemo(
    () => sensors.filter((sensor) => sensor.fieldId === activeFieldId),
    [activeFieldId]
  );

  const activeZones = useMemo(
    () => zones.filter((zone) => zone.fieldId === activeFieldId),
    [activeFieldId]
  );

  const activeRecommendations = useMemo(
    () => recommendations.filter((item) => !item.fieldId || item.fieldId === activeFieldId),
    [activeFieldId]
  );

  useEffect(() => {
    setSelectedZone(null);
    setZoneModalVisible(false);
  }, [activeFieldId]);
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [activeFieldId, fadeAnim]);

  const dynamicStats = useMemo(() => {
    if (activeSensors.length === 0) return statistics;

    const healthScore = Math.round(
      activeSensors.reduce((sum, sensor) => sum + getStatusHealthScore(sensor.status), 0) /
        activeSensors.length
    );

    const warningCount = activeSensors.filter((sensor) => sensor.status === 'warning').length;
    const criticalCount = activeSensors.filter((sensor) => sensor.status === 'critical').length;
    const alerts = warningCount + criticalCount;

    const averageMoisture =
      activeSensors.reduce((sum, sensor) => sum + sensor.soilMoisture, 0) / activeSensors.length;
    const baseWaterUsage = activeField.areaHectares * (0.19 + (60 - averageMoisture) * 0.004);

    const waterUsage = Math.max(2.8, baseWaterUsage);

    return statistics.map((stat) => {
      if (stat.id === 'stats-soil') return { ...stat, value: `${healthScore}%` };
      if (stat.id === 'stats-water') return { ...stat, value: `${waterUsage.toFixed(1)} m3` };
      if (stat.id === 'stats-sensors') return { ...stat, value: String(activeSensors.length) };
      if (stat.id === 'stats-alerts') return { ...stat, value: String(alerts) };
      return stat;
    });
  }, [activeField.areaHectares, activeSensors]);

  const onSelectSensor = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor);
    setSensorModalVisible(true);
  }, []);

  const onSelectZone = useCallback((zone: SoilZone) => {
    setSelectedZone(zone);
    setZoneModalVisible(true);
  }, []);

  const onToggleLayer = useCallback((layer: LayerKey) => {
    setVisibleLayers((previous) =>
      previous.includes(layer) ? previous.filter((item) => item !== layer) : [...previous, layer]
    );
  }, []);

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
          <TouchableOpacity
            key={item.code}
            style={[styles.langButton, locale === item.code ? styles.langActive : undefined]}
            onPress={() => setLanguage(item.code)}
          >
            <Text style={styles.langText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('topSummary')}</Text>
      <TopCards stats={dynamicStats} />

      {Platform.OS === 'web' ? (
        <Animated.View style={[styles.webLayout, { opacity: fadeAnim }]}>
          <Sidebar
            fields={fields}
            selectedFieldId={activeFieldId}
            onSelectField={setActiveFieldId}
            visibleLayers={visibleLayers}
            onToggleLayer={onToggleLayer}
          />
          <View style={styles.mapRegion}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapLabel}>{t('map')}</Text>
              <View style={styles.mapModeGroup}>
                <Text style={styles.mapModeLabel}>{t('mapMode')}:</Text>
                <TouchableOpacity
                  style={[
                    styles.mapModeButton,
                    mapMode === 'zones' ? styles.mapModeButtonActive : undefined
                  ]}
                  onPress={() => setMapMode('zones')}
                >
                  <Text style={styles.mapModeButtonText}>{t('zonesView')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.mapModeButton,
                    mapMode === 'heatmap' ? styles.mapModeButtonActive : undefined
                  ]}
                  onPress={() => setMapMode('heatmap')}
                >
                  <Text style={styles.mapModeButtonText}>{t('heatmapView')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FieldMap
              fieldCenter={activeField.center}
              fieldBoundary={activeField.boundary}
              zones={activeZones}
              sensors={activeSensors}
              onSelectSensor={onSelectSensor}
              onSelectZone={onSelectZone}
              activeZoneId={selectedZone?.id}
              visibleLayers={visibleLayers}
              mapMode={mapMode}
            />
          </View>
          <Recommendations recommendations={activeRecommendations} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.mobileLayout, { opacity: fadeAnim }]}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapLabel}>{t('map')}</Text>
            <View style={styles.mapModeGroup}>
              <Text style={styles.mapModeLabel}>{t('mapMode')}:</Text>
              <TouchableOpacity
                style={[styles.mapModeButton, mapMode === 'zones' ? styles.mapModeButtonActive : undefined]}
                onPress={() => setMapMode('zones')}
              >
                <Text style={styles.mapModeButtonText}>{t('zonesView')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapModeButton, mapMode === 'heatmap' ? styles.mapModeButtonActive : undefined]}
                onPress={() => setMapMode('heatmap')}
              >
                <Text style={styles.mapModeButtonText}>{t('heatmapView')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FieldMap
            fieldCenter={activeField.center}
            fieldBoundary={activeField.boundary}
            zones={activeZones}
            sensors={activeSensors}
            onSelectSensor={onSelectSensor}
            onSelectZone={onSelectZone}
            activeZoneId={selectedZone?.id}
            visibleLayers={visibleLayers}
            mapMode={mapMode}
          />
          <Sidebar
            fields={fields}
            selectedFieldId={activeFieldId}
            onSelectField={setActiveFieldId}
            visibleLayers={visibleLayers}
            onToggleLayer={onToggleLayer}
          />
          <Recommendations recommendations={activeRecommendations} />
        </Animated.View>
      )}

      <SensorModal
        visible={sensorModalVisible}
        sensor={selectedSensor}
        onClose={() => setSensorModalVisible(false)}
      />

      <ZoneModal
        visible={zoneModalVisible}
        zone={selectedZone}
        sensors={activeSensors}
        onClose={() => setZoneModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F1115' },
  contentContainer: { padding: 24, paddingBottom: 80 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 12,
    color: '#93A1B2',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    backgroundColor: '#16191E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 14
  },
  localeLabel: { fontWeight: '600', marginRight: 8, color: '#A1ADBC' },
  langButton: {
    borderWidth: 1,
    borderColor: '#2E3440',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
    backgroundColor: '#0F1115'
  },
  langText: { color: '#CBD6E2' },
  langActive: { backgroundColor: 'rgba(56,189,248,0.16)', borderColor: '#38BDF8' },
  webLayout: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  mobileLayout: {
    gap: 16
  },
  mapRegion: { flex: 1, minHeight: 620 },
  mapHeaderRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  mapLabel: {
    fontWeight: '700',
    color: '#97A5B3',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.7
  },
  mapModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  mapModeLabel: {
    fontSize: 11,
    color: '#93A1B2',
    marginRight: 6
  },
  mapModeButton: {
    borderWidth: 1,
    borderColor: '#323946',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    backgroundColor: 'rgba(22,25,30,0.72)'
  },
  mapModeButtonText: {
    color: '#BEC9D8'
  },
  mapModeButtonActive: {
    borderColor: 'rgba(56,189,248,0.5)',
    backgroundColor: 'rgba(56,189,248,0.16)'
  }
});
