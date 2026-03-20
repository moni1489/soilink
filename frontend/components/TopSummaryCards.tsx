import React from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import i18n from '../i18n';
import { Activity, Droplets, Radio, AlertTriangle } from 'lucide-react-native';

export default function TopSummaryCards() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={styles.iconBox}><Activity color="#4CAF50" size={24} /></View>
        <View>
          <Text style={styles.title}>{i18n.t('cards.overallHealth')}</Text>
          <Text style={[styles.value, { color: '#4CAF50' }]}>94% - Good</Text>
        </View>
      </View>
      
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}><Droplets color="#2196F3" size={24} /></View>
        <View>
          <Text style={styles.title}>{i18n.t('cards.waterUsage')}</Text>
          <Text style={styles.value}>1,420 L</Text>
        </View>
      </View>

      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}><Radio color="#9C27B0" size={24} /></View>
        <View>
          <Text style={styles.title}>{i18n.t('cards.activeSensors')}</Text>
          <Text style={styles.value}>4 / 4 Online</Text>
        </View>
      </View>

      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}><AlertTriangle color="#F44336" size={24} /></View>
        <View>
          <Text style={styles.title}>{i18n.t('cards.alerts')}</Text>
          <Text style={[styles.value, { color: '#F44336' }]}>2 Alerts</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 16, padding: 16 },
  containerMobile: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardMobile: { minWidth: '45%' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontSize: 13, color: '#666', marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '700', color: '#333' }
});
