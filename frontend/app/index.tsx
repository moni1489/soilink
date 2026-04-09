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
import ChatInterface from '../components/ChatInterface';
import FieldRegistration from '../components/FieldRegistration';
import { LayerKey, Sensor, SoilZone, MapMode } from '../types';
import { useLocale } from '../hooks/useLocale';

const defaultVisible: LayerKey[] = [
  'soilMoisture',
  'temperature',
  'pH',
  'electricalConductivity',
  'gasComposition'
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
  const [chatVisible, setChatVisible] = useState(false);
  const [registrationVisible, setRegistrationVisible] = useState(false);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');
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
            onOpenAI={() => setChatVisible(true)}
            onRegisterOpen={() => setRegistrationVisible(true)}
          />
          <View style={styles.mapRegion}>
              <View style={styles.mapHeaderRow}>
                <Text style={styles.mapLabel}>{t('map')}</Text>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={styles.mapModeGroup}>
                    <Text style={styles.mapModeLabel}>Theme:</Text>
                    <TouchableOpacity
                      style={[
                        styles.mapModeButton,
                        mapTheme === 'light' ? styles.mapModeButtonActive : undefined
                      ]}
                      onPress={() => setMapTheme('light')}
                    >
                      <Text style={styles.mapModeButtonText}>Light</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.mapModeButton,
                        mapTheme === 'dark' ? styles.mapModeButtonActive : undefined
                      ]}
                      onPress={() => setMapTheme('dark')}
                    >
                      <Text style={styles.mapModeButtonText}>Dark</Text>
                    </TouchableOpacity>
                  </View>

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
              theme={mapTheme}
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
            onOpenAI={() => setChatVisible(true)}
            onRegisterOpen={() => setRegistrationVisible(true)}
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

      {chatVisible && (
        <ChatInterface 
          fieldId={activeFieldId} 
          onClose={() => setChatVisible(false)} 
        />
      )}

      <FieldRegistration 
        visible={registrationVisible}
        onClose={() => setRegistrationVisible(false)}
        onSuccess={() => { /* Refresh fields if needed */ }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F14' },
  contentContainer: { padding: 32, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 20,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 20
  },
  localeLabel: { fontWeight: '700', marginRight: 12, color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 },
  langButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  langText: { color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', fontSize: 13 },
  langActive: { backgroundColor: 'rgba(0, 245, 155, 0.12)', borderColor: '#00F59B' },
  webLayout: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  mobileLayout: {
    gap: 24
  },
  mapRegion: { flex: 1, minHeight: 650 },
  mapHeaderRow: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  mapLabel: {
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    fontSize: 14,
    letterSpacing: 1
  },
  mapModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  mapModeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 12,
    fontWeight: '700'
  },
  mapModeButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent'
  },
  mapModeButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    fontSize: 13
  },
  mapModeButtonActive: {
    backgroundColor: '#00F59B'
  }
});
