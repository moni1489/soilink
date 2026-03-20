import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import i18n from '../i18n';
import { Droplets, Thermometer, FlaskConical, Zap, CloudFog, ActivitySquare, Map as MapIcon } from 'lucide-react-native';

const LAYERS = [
  { id: 'moisture', icon: Droplets, color: '#2196F3' },
  { id: 'temperature', icon: Thermometer, color: '#F44336' },
  { id: 'ph', icon: FlaskConical, color: '#9C27B0' },
  { id: 'ec', icon: Zap, color: '#FF9800' },
  { id: 'gas', icon: CloudFog, color: '#607D8B' },
  { id: 'vibroacoustic', icon: ActivitySquare, color: '#795548' },
];

interface SidebarProps {
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
}

export default function Sidebar({ activeLayer, setActiveLayer }: SidebarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{i18n.t('dashboard.fields')}</Text>
      
      <TouchableOpacity style={[styles.fieldItem, styles.fieldActive]}>
        <View style={styles.fieldIcon}>
          <MapIcon color="#4CAF50" size={20} />
        </View>
        <View style={styles.fieldTextContainer}>
          <Text style={styles.fieldName}>Ust-Kamenogorsk Main</Text>
          <Text style={styles.fieldStatus}>20 ha • Healthy</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.fieldItem}>
        <View style={[styles.fieldIcon, { backgroundColor: '#F5F5F5' }]}>
          <MapIcon color="#9E9E9E" size={20} />
        </View>
        <View style={styles.fieldTextContainer}>
          <Text style={[styles.fieldName, { color: '#9E9E9E' }]}>Field 2 (Mock)</Text>
          <Text style={styles.fieldStatus}>15 ha • Pending Data</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{i18n.t('dashboard.layers')}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {LAYERS.map(layer => {
          const IconComponent = layer.icon;
          const isActive = activeLayer === layer.id;
          return (
            <TouchableOpacity 
              key={layer.id} 
              style={[styles.layerItem, isActive && styles.layerActive]}
              onPress={() => setActiveLayer(layer.id)}
            >
              <View style={[styles.layerIconBox, isActive && { backgroundColor: layer.color }]}>
                <IconComponent size={18} color={isActive ? "#fff" : layer.color} />
              </View>
              <Text style={[styles.layerText, isActive && styles.layerTextActive]}>
                {i18n.t(`layers.${layer.id}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flex: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0' },
  fieldActive: { backgroundColor: '#F1F8E9', borderColor: '#AED581' },
  fieldIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  fieldTextContainer: { marginLeft: 12, flex: 1 },
  fieldName: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 2 },
  fieldStatus: { fontSize: 12, color: '#757575' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 20 },
  layerItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 8 },
  layerActive: { backgroundColor: '#F5F5F5' },
  layerIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  layerText: { fontSize: 14, color: '#616161', fontWeight: '500', flex: 1 },
  layerTextActive: { color: '#212121', fontWeight: '700' }
});
