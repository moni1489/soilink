import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform, Animated, useWindowDimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../i18n/i18n';
import { useTranslation } from 'react-i18next';
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
import PredictionCard from '../components/PredictionCard';
import TimelineSlider from '../components/TimelineSlider';
import CalendarView from '../components/CalendarView';
import { LayerKey, Sensor, SoilZone, MapMode, SoilGridsProperty, SoilDepth, Prediction } from '../types';
import { fields, zones, sensors, statistics, recommendations, predictions } from '../data/mockData';
import { useLocale } from '../hooks/useLocale';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const [activeFieldId, setActiveFieldId] = useState(fields[0].id);
  const [visibleLayers, setVisibleLayers] = useState<LayerKey[]>(defaultVisible);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState<SoilZone | null>(null);
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('zones');
  const [selectedSoilProperty, setSelectedSoilProperty] = useState<SoilGridsProperty>('clay');
  const [selectedDepth, setSelectedDepth] = useState<SoilDepth>('0-5cm');
  const [selectedDaysAgo, setSelectedDaysAgo] = useState(0);
  const [activeTab, setActiveTab] = useState<'map' | 'ai' | 'recommendations' | 'calendar'>('map');
  const [chatVisible, setChatVisible] = useState(false);
  const [registrationVisible, setRegistrationVisible] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [globalSoilData, setGlobalSoilData] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerData, setScannerData] = useState<any>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
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

  const activePrediction = useMemo(() => {
    const base = predictions.find((p) => p.fieldId === activeFieldId);
    if (!base || selectedDaysAgo === 0) return base;

    // Simulate historical prediction data
    return {
      ...base,
      cropConfidence: Math.max(0.6, base.cropConfidence - (selectedDaysAgo * 0.02)),
      soilStateConfidence: Math.max(0.55, base.soilStateConfidence - (selectedDaysAgo * 0.012)),
      isHistorical: true,
      historicalDate: selectedDaysAgo
    };
  }, [activeFieldId, selectedDaysAgo]);

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
            '0-5cm': { phh2o: 68, nitrogen: 140, soc: 28, clay_content: 210, sand_content: 440, silt_content: 350, bdod: 125 },
            '5-15cm': { phh2o: 64, nitrogen: 110, soc: 22, clay_content: 240, sand_content: 410, silt_content: 360, bdod: 138 },
            '15-30cm': { phh2o: 62, nitrogen: 105, soc: 19, clay_content: 290, sand_content: 360, silt_content: 340, bdod: 145 },
            '30-60cm': { phh2o: 58, nitrogen: 85, soc: 14, clay_content: 360, sand_content: 290, silt_content: 310, bdod: 155 },
            '60-100cm': { phh2o: 54, nitrogen: 45, soc: 9, clay_content: 420, sand_content: 230, silt_content: 280, bdod: 162 }
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
  const isDark = theme === 'dark';
  const colors = isDark 
    ? { bg: '#000000', cardBg: '#111111', text: '#FFFFFF', subText: '#94A3B8', border: '#222222' }
    : { bg: '#F8FAFC', cardBg: '#FFFFFF', text: '#020617', subText: '#475569', border: '#CBD5E1' };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.contentContainer}>
        {isMobile && (
          <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 15) }]}>
            <TouchableOpacity onPress={() => setMobileMenuVisible(true)} style={styles.headerDotBtn}>
              <View style={styles.headerDot} />
              <View style={[styles.headerDot, { opacity: 0.6 }]} />
              <View style={[styles.headerDot, { opacity: 0.3 }]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Soilink</Text>
            <View style={styles.langMiniRow}>
              {languageButtons.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  onPress={() => setLanguage(item.code)}
                  style={[styles.langMiniBtn, locale === item.code ? styles.langMiniActive : undefined]}
                >
                  <Text style={styles.langMiniText}>{item.code.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!isMobile && (
          <View style={[styles.localeRow, { backgroundColor: isDark ? '#111111' : '#FFFFFF', borderColor: colors.border, borderWidth: 1, borderRadius: 36, marginHorizontal: 60, marginTop: 20, paddingLeft: 80, paddingRight: 40, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 }]}>
            <Text style={[styles.localeLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>{t('chooseLanguage')}:</Text>
            {languageButtons.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.langButton, locale === item.code ? { borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.1)' } : { borderColor: colors.border }]}
                onPress={() => setLanguage(item.code)}
              >
                <Text style={[styles.langText, { color: isDark ? '#FFFFFF' : '#020617' }, locale === item.code && { color: '#059669', fontWeight: '900' }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('topSummary')}</Text>
        <TopCards stats={dynamicStats} />

        <Modal
          visible={mobileMenuVisible && isMobile}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMobileMenuVisible(false)}
        >
          <View style={styles.mobileMenuContainer}>
            <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setMobileMenuVisible(false)}>
              <Text style={styles.closeMenuText}>✕ {t('close') || 'Close'}</Text>
            </TouchableOpacity>
            <Sidebar
              fields={fields}
              selectedFieldId={activeFieldId}
              onSelectField={(id) => {
                setActiveFieldId(id);
                setMobileMenuVisible(false);
              }}
              visibleLayers={visibleLayers}
              onToggleLayer={onToggleLayer}
              selectedSoilProperty={selectedSoilProperty}
              onSelectSoilProperty={setSelectedSoilProperty}
              selectedDepth={selectedDepth}
              onSelectDepth={setSelectedDepth}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenAI={() => {
                setChatVisible(true);
                setMobileMenuVisible(false);
              }}
              onRegisterOpen={() => {
                setRegistrationVisible(true);
                setMobileMenuVisible(false);
              }}
              onOpenScanner={() => {
                setScannerVisible(true);
                setMobileMenuVisible(false);
              }}
              recommendations={activeRecommendations}
            />
          </View>
        </Modal>

        {!isMobile ? (
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
              recommendations={activeRecommendations}
              style={!mapVisible ? { flex: 1, width: undefined } : undefined}
            />
            {mapVisible ? (
              <View style={[styles.mapContainerOuter, { backgroundColor: colors.bg, borderRadius: isDark ? 24 : 0, padding: 10, flex: 1 }]}>
                <View style={styles.mapHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[styles.mapLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(2, 6, 23, 0.4)' }]}>{t('map')}</Text>
                    <TouchableOpacity
                      onPress={() => setMapVisible(false)}
                      style={[styles.mapCloseBtn, { backgroundColor: isDark ? '#1a1a1a' : '#F1F5F9', borderColor: isDark ? '#333' : '#CBD5E1' }]}
                    >
                      <Text style={[styles.mapCloseBtnText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(2,6,23,0.4)' }]}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.mapModeGroup, { backgroundColor: isDark ? '#111111' : '#F1F5F9', borderColor: isDark ? '#222222' : '#CBD5E1' }]}>
                      <Text style={styles.mapModeLabel}>{t('theme')}:</Text>
                      <TouchableOpacity
                        style={[
                          styles.themeToggleButton,
                          { backgroundColor: isDark ? '#222222' : 'transparent', borderColor: isDark ? '#333' : 'transparent' },
                          isDark ? styles.themeToggleActive : undefined
                        ]}
                        onPress={toggleTheme}
                      >
                        <Text style={[styles.themeToggleText, { color: isDark ? '#fff' : '#020617' }]}>
                          {isDark ? t('dark') : t('light')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.mapModeGroup, { backgroundColor: isDark ? '#111111' : '#F1F5F9', borderColor: isDark ? '#222222' : '#CBD5E1' }]}>
                      <Text style={[styles.mapModeLabel, { color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(2, 6, 23, 0.4)' }]}>{t('mapMode')}:</Text>
                      <TouchableOpacity
                        style={[styles.mapModeButton, mapMode === 'zones' ? styles.mapModeButtonActive : undefined]}
                        onPress={() => setMapMode('zones')}
                      >
                        <Text style={[styles.mapModeButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(2, 6, 23, 0.5)' }]}>{t('zonesView')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.mapModeButton, mapMode === 'heatmap' ? styles.mapModeButtonActive : undefined]}
                        onPress={() => setMapMode('heatmap')}
                      >
                        <Text style={[styles.mapModeButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(2, 6, 23, 0.5)' }]}>{t('heatmapView')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.mapModeButton, mapMode === 'satellite' ? styles.mapModeButtonActive : undefined]}
                        onPress={() => setMapMode('satellite')}
                      >
                        <Text style={[styles.mapModeButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(2, 6, 23, 0.5)' }]}>{t('satelliteView') || 'Satellite'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.mapRegion, { borderRadius: isDark ? 24 : 0, margin: isDark ? 16 : 0, borderColor: isDark ? '#222222' : '#E2E8F0', backgroundColor: isDark ? '#000' : '#fff' }]}>
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
                    theme={theme}
                    historicalOffset={selectedDaysAgo}
                  />
                  <TimelineSlider
                    selectedDaysAgo={selectedDaysAgo}
                    onTimeChange={setSelectedDaysAgo}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setMapVisible(true)}
                style={[styles.mapCollapsedBtn, { backgroundColor: isDark ? '#111111' : '#F1F5F9', borderColor: isDark ? '#222222' : '#CBD5E1' }]}
              >
                <Text style={[styles.mapCollapsedBtnText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(2,6,23,0.35)' }]}>⤢</Text>
                <Text style={[styles.mapCollapsedLabel, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(2,6,23,0.3)' }]}>{t('map')}</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.recommendationsRegion, !mapVisible && { flex: 1, width: undefined }]}>
              {activeTab === 'calendar' ? (
                <CalendarView />
              ) : (
                <>
                  {activePrediction && <PredictionCard prediction={activePrediction} />}
                  <Recommendations recommendations={activeRecommendations} />
                </>
              )}
            </View>
          </Animated.View>
        ) : (
          <ScrollView style={styles.mobileLayout} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.mapHeaderRow}>
              <Text style={[styles.mapLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(2, 6, 23, 0.7)' }]}>{t('map')}</Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.mapModeGroup, { backgroundColor: isDark ? '#111111' : '#F1F5F9', borderColor: isDark ? '#222222' : '#CBD5E1' }]}>
                  <Text style={[styles.mapModeLabel, { color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(2, 6, 23, 0.8)' }]}>{t('theme')}:</Text>
                  <TouchableOpacity
                    style={[
                      styles.themeToggleButton, 
                      { backgroundColor: isDark ? '#222222' : 'transparent', borderColor: isDark ? '#333' : 'transparent' },
                      isDark ? styles.themeToggleActive : undefined
                    ]}
                    onPress={toggleTheme}
                  >
                    <Text style={[styles.themeToggleText, { color: isDark ? '#fff' : '#020617' }]}>
                      {isDark ? t('dark') : t('light')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.mapRegion, { height: 420, marginTop: 10, borderRadius: isDark ? 24 : 0, margin: isDark ? 16 : 0, borderColor: isDark ? '#222222' : '#E2E8F0', backgroundColor: isDark ? '#000' : '#fff' }]}>
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
                theme={theme}
                historicalOffset={selectedDaysAgo}
              />
              <TimelineSlider
                selectedDaysAgo={selectedDaysAgo}
                onTimeChange={setSelectedDaysAgo}
              />
              <View style={styles.mobileMapControlsFloating}>
                <TouchableOpacity
                  style={[styles.floatingModeBtn, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(5, 245, 155, 0.15)' : '#E2E8F0' }, mapMode === 'zones' && styles.floatingModeBtnActive]}
                  onPress={() => setMapMode('zones')}
                >
                  <Text style={[styles.floatingModeBtnText, { color: isDark ? '#FFFFFF' : '#020617' }]}>{t('zonesView')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.floatingModeBtn, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(5, 245, 155, 0.15)' : '#E2E8F0' }, mapMode === 'heatmap' && styles.floatingModeBtnActive]}
                  onPress={() => setMapMode('heatmap')}
                >
                  <Text style={[styles.floatingModeBtnText, { color: isDark ? '#FFFFFF' : '#020617' }]}>{t('heatmapView')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.floatingModeBtn, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(5, 245, 155, 0.15)' : '#E2E8F0' }, mapMode === 'satellite' && styles.floatingModeBtnActive]}
                  onPress={() => setMapMode('satellite')}
                >
                  <Text style={[styles.floatingModeBtnText, { color: isDark ? '#FFFFFF' : '#020617' }]}>{t('satelliteView')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.mobileActionContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={[styles.mobileActionRowGlass, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0', borderWidth: 1.5, borderRadius: 24 }]}>
                <TouchableOpacity style={styles.mobileActionBtnPremium} onPress={() => setScannerVisible(true)}>
                  <Text style={[styles.mobileActionBtnTextPremium, { color: isDark ? '#FFFFFF' : '#020617' }]}>{t('verticalScanner')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileActionBtnPremium} onPress={() => setChatVisible(true)}>
                  <Text style={[styles.mobileActionBtnTextPremium, { color: isDark ? '#FFFFFF' : '#020617' }]}>{t('aiAgent')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.mobileActionContainer}>
              <Text style={styles.sectionTitle}>{t('aiPrediction')}</Text>
              <View style={styles.premiumCardContainer}>
                {activePrediction && <PredictionCard prediction={activePrediction} />}
              </View>
            </View>
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
  root: { flex: 1, height: (Platform.OS === 'web' ? '100vh' : '100%') as any, overflow: 'hidden' },
  contentContainer: {
    flex: 1,
    padding: 20,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    display: 'flex',
    flexDirection: 'column'
  },
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
    flexWrap: 'wrap',
    paddingVertical: 12
  },
  localeLabel: { fontWeight: '900', marginRight: 12, fontSize: 13 },
  langButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1.5,
  },
  langText: { fontWeight: '700', fontSize: 12 },
  langActive: { borderColor: '#059669' },
  webLayout: { flex: 1, flexDirection: 'row', gap: 16 },
  mobileLayout: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerDotBtn: {
    flexDirection: 'row',
    gap: 4,
    padding: 10,
    marginLeft: -10,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#05F59B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginLeft: 20,
  },
  langMiniRow: {
    flexDirection: 'row',
    gap: 4,
  },
  langMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langMiniActive: {
    backgroundColor: 'rgba(5, 245, 155, 0.2)',
    borderColor: '#05F59B',
  },
  langMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  mobileMenuContainer: {
    flex: 1,
  },
  closeMenuBtn: {
    padding: 20,
    backgroundColor: '#059669',
    margin: 20,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#05F59B',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  closeMenuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mobileMapControlsFloating: {
    position: 'absolute',
    top: 20,
    right: 20,
    gap: 8,
  },
  floatingModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  floatingModeBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#05F59B',
  },
  floatingModeBtnText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mobileActionContainer: {
    paddingHorizontal: 15,
    marginTop: -30,
    marginBottom: 20,
    zIndex: 100,
  },
  mobileActionRowGlass: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileActionBtnPremium: {
    flex: 1,
    backgroundColor: 'rgba(5, 245, 155, 0.05)',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
  },
  mobileActionBtnTextPremium: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  premiumCardContainer: {
    shadowColor: '#05F59B',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  mapContainerOuter: { 
    flex: 1, 
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 10
  },
  mapRegion: {
    flex: 1,
    borderWidth: 1.5,
    overflow: 'hidden'
  },
  recommendationsRegion: { width: 340 },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12
  },
  mapLabel: {
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 2,
  },
  mapCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCloseBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mapCollapsedBtn: {
    width: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  mapCollapsedBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapCollapsedLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    writingDirection: 'ltr',
  },
  mapModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  mapModeLabel: {
    fontSize: 11,
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
    fontWeight: '700',
    fontSize: 12
  },
  mapModeButtonActive: {
    backgroundColor: '#059669'
  },
  themeToggleButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  themeToggleActive: {
    backgroundColor: '#334155',
  },
  themeToggleText: {
    fontWeight: '700',
    fontSize: 12
  }
});
