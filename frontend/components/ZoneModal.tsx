import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Sensor, SoilZone } from '../types';
import { calculatePolygonAreaHectares, pointInPolygon } from '../utils/map';

interface Props {
  visible: boolean;
  zone: SoilZone | null;
  sensors: Sensor[];
  onClose: () => void;
}

const getStatusColor = (zoneColor: SoilZone['color']) => {
  if (zoneColor === 'green') return '#166534';
  if (zoneColor === 'yellow') return '#a16207';
  return '#b91c1c';
};

const getStatusKey = (zoneColor: SoilZone['color']) => {
  if (zoneColor === 'green') return 'healthy';
  if (zoneColor === 'yellow') return 'warning';
  return 'critical';
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export default function ZoneModal({ visible, zone, sensors, onClose }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = isDark 
    ? { 
        bg: '#000000', 
        text: '#FFFFFF', 
        subText: 'rgba(255, 255, 255, 0.4)',
        border: '#064E3B', 
        cardBg: 'rgba(255, 255, 255, 0.03)',
        overlay: 'rgba(0, 0, 0, 0.85)'
      }
    : { 
        bg: '#FFFFFF', 
        text: '#020617', 
        subText: 'rgba(2, 6, 23, 0.4)',
        border: '#E2E8F0', 
        cardBg: '#F8FAFC',
        overlay: 'rgba(0, 0, 0, 0.6)'
      };

  const sensorsInZone = useMemo(() => {
    if (!zone) return [];
    return sensors.filter((sensor) => pointInPolygon(sensor.coordinates, zone.polygon));
  }, [zone, sensors]);

  const summary = useMemo(() => {
    if (!zone) {
      return {
        areaHectares: 0,
        avgMoisture: 0,
        avgTemp: 0,
        avgPh: 0,
        avgEc: 0
      };
    }

    return {
      areaHectares: calculatePolygonAreaHectares(zone.polygon),
      avgMoisture: average(sensorsInZone.map((sensor) => sensor.soilMoisture)),
      avgTemp: average(sensorsInZone.map((sensor) => sensor.soilTemperature)),
      avgPh: average(sensorsInZone.map((sensor) => sensor.pH)),
      avgEc: average(sensorsInZone.map((sensor) => sensor.electricalConductivity))
    };
  }, [zone, sensorsInZone]);

  if (!zone) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: '#059669' }]}>{t('zoneDetails')}</Text>
              <Text style={[styles.zoneName, { color: colors.text }]}>{zone.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
              <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(zone.color) }]}>
            <Text style={styles.statusBadgeText}>
              {t('status')}: {t(getStatusKey(zone.color))}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('zoneAreaHectares')}: <Text style={{ color: colors.text }}>{summary.areaHectares.toFixed(1)} ha</Text></Text>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('sensorsInZone')}: <Text style={{ color: colors.text }}>{sensorsInZone.length}</Text></Text>
          </View>

          {sensorsInZone.length > 0 ? (
            <View style={[styles.metricsBlock, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(5, 150, 105, 0.1)' : '#E2E8F0' }]}>
              <Text style={[styles.metricLine, { color: colors.text }]}>
                {t('avgSoilMoisture')}: {summary.avgMoisture.toFixed(1)}%
              </Text>
              <Text style={[styles.metricLine, { color: colors.text }]}>
                {t('avgSoilTemperature')}: {summary.avgTemp.toFixed(1)}C
              </Text>
              <Text style={[styles.metricLine, { color: colors.text }]}>
                {t('avgPh')}: {summary.avgPh.toFixed(2)}
              </Text>
              <Text style={[styles.metricLine, { color: colors.text }]}>
                {t('avgElectricalConductivity')}: {summary.avgEc.toFixed(2)} mS/cm
              </Text>
              <Text style={styles.sensorList}>
                {t('sensorList')}: {sensorsInZone.map((sensor) => sensor.name).join(', ')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.subText }]}>{t('noSensorsInZone')}</Text>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  zoneName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: { fontSize: 12 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 24
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  infoGrid: {
    gap: 6,
    marginBottom: 8
  },
  infoLine: {
    fontSize: 14,
    fontWeight: '600'
  },
  metricsBlock: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1
  },
  metricLine: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8
  },
  sensorList: {
    color: '#059669',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800'
  },
  emptyText: {
    marginTop: 20,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600'
  },
  closeButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center'
  },
  closeButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});
