import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import i18n from '../i18n';
import { Sensor } from '../types';
import { X, Star, CheckCircle, AlertTriangle } from 'lucide-react-native';

interface ModalProps {
  selectedSensor: Sensor | null;
  onClose: () => void;
}

export default function SensorDetailsModal({ selectedSensor, onClose }: ModalProps) {
  if (!selectedSensor) return null;

  const getStatusIcon = () => {
    if (selectedSensor.status === 'active') return <CheckCircle color="#4CAF50" size={20} />;
    if (selectedSensor.status === 'warning') return <AlertTriangle color="#FF9800" size={20} />;
    return <AlertTriangle color="#F44336" size={20} />;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={!!selectedSensor}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{selectedSensor.name}</Text>
              <View style={styles.statusRow}>
                {getStatusIcon()}
                <Text style={styles.statusText}>{selectedSensor.status.toUpperCase()}</Text>
                {selectedSensor.premiumFeatures && (
                  <View style={styles.premiumTag}>
                    <Star color="#fff" size={12} style={{ marginRight: 4 }} />
                    <Text style={styles.premiumTagText}>PRO</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#666" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>{i18n.t('metrics.ph')}</Text>
              <Text style={styles.dataValue}>{selectedSensor.data.ph}</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>{i18n.t('metrics.temperature')}</Text>
              <Text style={styles.dataValue}>{selectedSensor.data.temperature}°C</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>{i18n.t('metrics.moisture')}</Text>
              <Text style={styles.dataValue}>{selectedSensor.data.moisture}%</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>{i18n.t('metrics.ec')}</Text>
              <Text style={styles.dataValue}>{selectedSensor.data.electricalConductivity} dS/m</Text>
            </View>
          </View>

          {selectedSensor.premiumFeatures && selectedSensor.data.vibroacoustic && (
            <View style={styles.premiumBox}>
              <Text style={styles.premiumTitle}>{i18n.t('metrics.vibroacoustic')}</Text>
              <Text style={styles.premiumText}>{selectedSensor.data.vibroacoustic}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalView: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1B5E20', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '600', color: '#666', marginRight: 8 },
  premiumTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9C27B0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  premiumTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  closeBtn: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 20 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  dataItem: { width: '47%', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  dataLabel: { fontSize: 13, color: '#757575', marginBottom: 6 },
  dataValue: { fontSize: 20, fontWeight: '800', color: '#212121' },
  premiumBox: { backgroundColor: '#F3E5F5', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#9C27B0' },
  premiumTitle: { fontSize: 14, fontWeight: '700', color: '#7B1FA2', marginBottom: 6 },
  premiumText: { fontSize: 14, color: '#4A148C', lineHeight: 20 }
});
