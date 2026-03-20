import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Text, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import i18n from '../i18n';
import TopSummaryCards from '../components/TopSummaryCards';
import Sidebar from '../components/Sidebar';
import RecommendationsPanel from '../components/RecommendationsPanel';
import FieldMap from '../components/FieldMap';
import SensorDetailsModal from '../components/SensorDetailsModal';
import { Sensor } from '../types';

export default function Dashboard() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024; // Web/Tablet landscape
  
  // Local UI State (replacing Zustand entirely to keep strictly lightweight map architecture)
  const [lang, setLang] = useState(i18n.locale);
  const [activeLayer, setActiveLayer] = useState('moisture');
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'ru' : lang === 'ru' ? 'kk' : 'en';
    i18n.locale = nextLang;
    setLang(nextLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{i18n.t('dashboard.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('dashboard.subtitle')} • {Platform.OS.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
          <Text style={styles.langText}>{lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Top Cards */}
      <TopSummaryCards />

      {/* Main Body */}
      {isLargeScreen ? (
        <View style={styles.mainBodyLarge}>
          <View style={styles.sidebarWrapper}>
            <Sidebar activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
          </View>
          <View style={styles.mapWrapper}>
            <FieldMap onSelectSensor={setSelectedSensor} />
          </View>
          <View style={styles.recWrapper}>
            <RecommendationsPanel />
          </View>
        </View>
      ) : (
        <ScrollView style={styles.mobileScroll} showsVerticalScrollIndicator={false}>
          {/* Map is at the top for context */}
          <View style={styles.mobileMapWrapper}>
            <FieldMap onSelectSensor={setSelectedSensor} />
          </View>
          {/* Recommendations and Layers follow */}
          <View style={styles.mobileSection}>
            <RecommendationsPanel />
          </View>
          <View style={styles.mobileSection}>
            <Sidebar activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      <SensorDetailsModal selectedSensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 22, fontWeight: '800', color: '#1B5E20' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2, fontWeight: '600' },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E8F5E9', borderRadius: 20 },
  langText: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  
  // Large Screen (Web)
  mainBodyLarge: { flex: 1, flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 16, marginTop: 8 },
  sidebarWrapper: { width: 300 },
  mapWrapper: { flex: 1 },
  recWrapper: { width: 320 },

  // Mobile
  mobileScroll: { flex: 1, marginHorizontal: 16, paddingBottom: 32, marginTop: 8 },
  mobileMapWrapper: { height: 400, marginBottom: 16 },
  mobileSection: { marginBottom: 16, minHeight: 300 }
});
