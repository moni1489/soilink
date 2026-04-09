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
import ComparisonModal from '../components/ComparisonModal';
import DepthProfileModal from '../components/DepthProfileModal';
import { LayerKey, Sensor, SoilZone, MapMode, SoilGridsProperty, SoilDepth } from '../types';
import { useLocale } from '../hooks/useLocale';

const defaultVisible: LayerKey[] = [
  'soilMoisture',
  'temperature',
  'pH',
  'electricalConductivity',
  'gasComposition',
  'soilGrids'
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
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('dark');
  const [selectedSoilProperty, setSelectedSoilProperty] = useState<SoilGridsProperty>('clay');
  const [selectedDepth, setSelectedDepth] = useState<SoilDepth>('0-5cm');
  const [activeTab, setActiveTab] = useState<'map' | 'ai'>('map');
  const [chatVisible, setChatVisible] = useState(false);
  const [registrationVisible, setRegistrationVisible] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [globalSoilData, setGlobalSoilData] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerData, setScannerData] = useState<any>(null);
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

  // Fetch Global Soil Data when sensor selected for Comparison
  useEffect(() => {
    if (selectedSensor) {
      const fetchGlobal = async () => {
        try {
          // In a real app, this would be a fetch call to the new endpoint
          // const res = await fetch(`${API_URL}/api/fields/${activeFieldId}/soilgrids?depth=${selectedDepth}`);
          // const data = await res.json();
          // setGlobalSoilData(data);
          
          // FOR MOCK DEMO (Matching the structure of soilgrid_service.py)
          setGlobalSoilData({
            phh2o: 65,
            nitrogen: 120,
            soc: 24,
            clay_content: 210,
            sand_content: 440,
            silt_content: 350,
            bdod: 135
          });
        } catch (err) {
          console.error('Failed to fetch global soil data', err);
        }
      };
      fetchGlobal();
    }
  }, [selectedSensor, selectedDepth]);

  // Fetch Multi-Depth Scanner Data
  useEffect(() => {
    if (activeFieldId && visibleLayers.includes('soilGrids')) {
      const fetchScanner = async () => {
        try {
          // const res = await fetch(`${API_URL}/api/fields/${activeFieldId}/scanner`);
          // const data = await res.json();
          // setScannerData(data);

          // FOR MOCK DEMO
          setScannerData({
            '0-5cm': { phh2o: 65, nitrogen: 120, soc: 24, clay_content: 210 },
            '5-15cm': { phh2o: 64, nitrogen: 110, soc: 22, clay_content: 230 },
            '15-30cm': { phh2o: 62, nitrogen: 95, soc: 18, clay_content: 280 },
            '30-60cm': { phh2o: 59, nitrogen: 70, soc: 14, clay_content: 350 },
            '60-100cm': { phh2o: 55, nitrogen: 50, soc: 10, clay_content: 410 }
          });
        } catch (err) {
          console.error('Failed to fetch scanner data', err);
        }
      };
      fetchScanner();
    }
  }, [activeFieldId, visibleLayers]);

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
    
    // Add Nitrogen and SOC averages for demo
    const avgNitrogen = activeSensors.reduce((sum, s) => sum + (s.nitrogen || 40), 0) / activeSensors.length;
    const avgSoc = activeSensors.reduce((sum, s) => sum + (s.soc || 12), 0) / activeSensors.length;

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

  const handleSelectSensor = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor);
    setComparisonVisible(true);
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
    <View style={styles.root}>
      <View style={styles.contentContainer}>
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
              selectedSoilProperty={selectedSoilProperty}
              onSelectSoilProperty={setSelectedSoilProperty}
              selectedDepth={selectedDepth}
              onSelectDepth={setSelectedDepth}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenAI={() => setChatVisible(true)}
              onRegisterOpen={() => setRegistrationVisible(true)}
              onOpenScanner={() => setScannerVisible(true)}
            />
            <View style={styles.mapContainerOuter}>
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
              <View style={styles.mapRegion}>
                <FieldMap
                  fieldCenter={activeField.center}
                  fieldBoundary={activeField.boundary}
                  zones={activeZones}
                  sensors={activeSensors}
                  onSelectSensor={handleSelectSensor}
                  onSelectZone={onSelectZone}
                  activeZoneId={selectedZone?.id}
                  visibleLayers={visibleLayers}
                  selectedSoilProperty={selectedSoilProperty}
                  selectedDepth={selectedDepth}
                  mapMode={mapMode}
                  theme={mapTheme}
                />
              </View>
            </View>
            <View style={styles.recommendationsRegion}>
               <Recommendations recommendations={activeRecommendations} />
            </View>
          </Animated.View>
        ) : (
          <ScrollView style={styles.mobileLayout} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapLabel}>{t('map')}</Text>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.mapModeGroup}>
                  <Text style={styles.mapModeLabel}>Theme:</Text>
                  <TouchableOpacity
                    style={[styles.mapModeButton, mapTheme === 'light' ? styles.mapModeButtonActive : undefined]}
                    onPress={() => setMapTheme('light')}
                  >
                    <Text style={styles.mapModeButtonText}>Light</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mapModeButton, mapTheme === 'dark' ? styles.mapModeButtonActive : undefined]}
                    onPress={() => setMapTheme('dark')}
                  >
                    <Text style={styles.mapModeButtonText}>Dark</Text>
                  </TouchableOpacity>
                </View>

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
            </View>
            <FieldMap
              fieldCenter={activeField.center}
              fieldBoundary={activeField.boundary}
              zones={activeZones}
              sensors={activeSensors}
              onSelectSensor={handleSelectSensor}
              onSelectZone={onSelectZone}
              activeZoneId={selectedZone?.id}
              visibleLayers={visibleLayers}
              selectedSoilProperty={selectedSoilProperty}
              selectedDepth={selectedDepth}
              mapMode={mapMode}
            />
            <Sidebar
              fields={fields}
              selectedFieldId={activeFieldId}
              onSelectField={setActiveFieldId}
              visibleLayers={visibleLayers}
              onToggleLayer={onToggleLayer}
              selectedSoilProperty={selectedSoilProperty}
              onSelectSoilProperty={setSelectedSoilProperty}
              selectedDepth={selectedDepth}
              onSelectDepth={setSelectedDepth}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenAI={() => setChatVisible(true)}
              onRegisterOpen={() => setRegistrationVisible(true)}
              onOpenScanner={() => setScannerVisible(true)}
            />
            <Recommendations recommendations={activeRecommendations} />
          </ScrollView>
        )}

        <SensorModal
          visible={sensorModalVisible}
          sensor={selectedSensor}
          onClose={() => setSensorModalVisible(false)}
        />
        
        <DepthProfileModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          property={selectedSoilProperty}
          data={scannerData}
        />

        <ZoneModal
          visible={zoneModalVisible}
          zone={selectedZone}
          sensors={activeSensors}
          onClose={() => setZoneModalVisible(false)}
        />

        <ComparisonModal 
          visible={comparisonVisible}
          onClose={() => setComparisonVisible(false)}
          sensorData={selectedSensor}
          globalData={globalSoilData}
          depth={selectedDepth}
        />

        {chatVisible && (
          <ChatInterface
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
            context={{
              field: activeField,
              sensors: activeSensors,
              depth: selectedDepth,
              property: selectedSoilProperty
            }}
          />
        )}

        <FieldRegistration 
          visible={registrationVisible}
          onClose={() => setRegistrationVisible(false)}
          onSuccess={() => { /* Refresh fields if needed */ }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000', height: (Platform.OS === 'web' ? '100vh' : '100%') as any, overflow: 'hidden' },
  contentContainer: { flex: 1, padding: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 20,
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap'
  },
  localeLabel: { fontWeight: '700', marginRight: 12, color: 'rgba(255, 255, 255, 0.3)', fontSize: 13 },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  langText: { color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600', fontSize: 12 },
  langActive: { backgroundColor: 'rgba(0, 245, 155, 0.1)', borderColor: '#059669', borderWidth: 1 },
  webLayout: { flex: 1, flexDirection: 'row', gap: 24 },
  mobileLayout: { flex: 1 },
  mapContainerOuter: { flex: 1, flexDirection: 'column' },
  mapRegion: { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#064E3B' },
  recommendationsRegion: { width: 340 },
  mapHeaderRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  mapLabel: {
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1
  },
  mapModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  mapModeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
    fontWeight: '700'
  },
  mapModeButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent'
  },
  mapModeButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    fontSize: 12
  },
  mapModeButtonActive: {
    backgroundColor: '#059669'
  }
});
