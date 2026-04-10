import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('zoneDetails')}</Text>
          <Text style={styles.zoneName}>{zone.name}</Text>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(zone.color) }]}>
            <Text style={styles.statusBadgeText}>
              {t('status')}: {t(getStatusKey(zone.color))}
            </Text>
          </View>

          <Text style={styles.infoLine}>
            {t('zoneAreaHectares')}: {summary.areaHectares.toFixed(1)} ha
          </Text>
          <Text style={styles.infoLine}>
            {t('sensorsInZone')}: {sensorsInZone.length}
          </Text>

          {sensorsInZone.length > 0 ? (
            <View style={styles.metricsBlock}>
              <Text style={styles.metricLine}>
                {t('avgSoilMoisture')}: {summary.avgMoisture.toFixed(1)}%
              </Text>
              <Text style={styles.metricLine}>
                {t('avgSoilTemperature')}: {summary.avgTemp.toFixed(1)}C
              </Text>
              <Text style={styles.metricLine}>
                {t('avgPh')}: {summary.avgPh.toFixed(2)}
              </Text>
              <Text style={styles.metricLine}>
                {t('avgElectricalConductivity')}: {summary.avgEc.toFixed(2)} mS/cm
              </Text>
              <Text style={styles.sensorList}>
                {t('sensorList')}: {sensorsInZone.map((sensor) => sensor.name).join(', ')}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('noSensorsInZone')}</Text>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#064E3B',
    padding: 32,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8
  },
  zoneName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 24
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  infoLine: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  metricsBlock: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.1)'
  },
  metricLine: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8
  },
  sensorList: {
    color: '#059669',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700'
  },
  emptyText: {
    marginTop: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center'
  },
  closeButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center'
  },
  closeText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});
