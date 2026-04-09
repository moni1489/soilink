import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Sensor, SoilGridsProperty, SoilDepth } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  sensorData: Sensor | null;
  globalData: Record<string, number> | null;
  depth: SoilDepth;
}

// Unit converters for SoilGrids raw values -> Standard agricultural units
const normalize = (key: string, val: number): string => {
  if (key === 'phh2o') return (val / 10).toFixed(1);
  if (key === 'nitrogen') return (val / 10).toFixed(1) + ' g/kg';
  if (key === 'soc') return (val / 10).toFixed(1) + ' g/kg';
  if (key.includes('content')) return (val / 10).toFixed(1) + ' %';
  if (key === 'bdod') return (val / 100).toFixed(2) + ' g/cm³';
  return val.toString();
};

const getComparisonLevel = (sensor: number, global: number) => {
  const diff = Math.abs(sensor - global);
  if (diff < global * 0.1) return { label: 'Optimal Match', color: '#059669' };
  if (diff < global * 0.25) return { label: 'Moderate Deviation', color: '#D97706' };
  return { label: 'Significant Gap', color: '#DC2626' };
};

export default function ComparisonModal({ visible, onClose, sensorData, globalData, depth }: Props) {
  if (!sensorData || !globalData) return null;

  const comparisonRows = [
    { label: 'Soil Moisture', sensor: sensorData.soilMoisture, global: 25, unit: '%' },
    { label: 'pH Level', sensor: sensorData.pH, global: globalData.phh2o / 10, unit: '' },
    { label: 'Nitrogen (N)', sensor: sensorData.nitrogen, global: globalData.nitrogen / 10, unit: ' g/kg' },
    { label: 'Organic Carbon', sensor: sensorData.soc, global: globalData.soc / 10, unit: ' g/kg' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Sensor vs. Global Data</Text>
              <Text style={styles.subtitle}>Analyzing Depth: {depth}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll}>
            <View style={styles.comparisonGrid}>
              <View style={styles.columnHeader}>
                <Text style={styles.propLabel}>PROPERTY</Text>
                <Text style={styles.dataLabel}>FIELD SENSOR</Text>
                <Text style={styles.dataLabel}>SOILGRIDS 250M</Text>
              </View>

              {comparisonRows.map((row, idx) => {
                const cmp = getComparisonLevel(row.sensor, row.global);
                return (
                  <View key={idx} style={styles.row}>
                    <View style={styles.propInfo}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: cmp.color + '20' }]}>
                        <Text style={[styles.statusText, { color: cmp.color }]}>{cmp.label}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.dataCol}>
                      <Text style={styles.sensorVal}>{row.sensor}{row.unit}</Text>
                      <View style={styles.miniBarContainer}>
                        <View style={[styles.miniBar, { width: `${Math.min(row.sensor * 2, 100)}%`, backgroundColor: '#059669' }]} />
                      </View>
                    </View>

                    <View style={styles.dataCol}>
                      <Text style={styles.globalVal}>{row.global.toFixed(1)}{row.unit}</Text>
                      <View style={styles.miniBarContainer}>
                        <View style={[styles.miniBar, { width: `${Math.min(row.global * 2, 100)}%`, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.aiInsight}>
              <Text style={styles.aiTitle}>AGRONOMIST INSIGHT</Text>
              <Text style={styles.aiText}>
                The Nitrogen level in your field is significantly lower than the regional baseline of {normalize('nitrogen', globalData.nitrogen)}.
                Consider a top-dressing of urea or organic compost to bridge this {((globalData.nitrogen/10) - sensorData.nitrogen).toFixed(1)} g/kg gap.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
            <Text style={styles.actionBtnText}>SAVE TO REPORT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    backgroundColor: '#0A0C10',
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 32,
    gap: 24,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  subtitle: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 12
  },
  scroll: {
    flexGrow: 0
  },
  comparisonGrid: {
    gap: 16
  },
  columnHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  propLabel: {
    flex: 1.5,
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '900'
  },
  dataLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12
  },
  propInfo: {
    flex: 1.5,
    gap: 4
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  dataCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8
  },
  sensorVal: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '900'
  },
  globalVal: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '900'
  },
  miniBarContainer: {
    width: '60%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1.5,
    overflow: 'hidden'
  },
  miniBar: {
    height: '100%',
    borderRadius: 1.5
  },
  aiInsight: {
    marginTop: 32,
    padding: 20,
    backgroundColor: 'rgba(5, 150, 105, 0.03)',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    gap: 8
  },
  aiTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  aiText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 20
  },
  actionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  }
});
