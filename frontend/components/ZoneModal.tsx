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
    backgroundColor: 'rgba(4, 22, 8, 0.38)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    width: '90%',
    maxWidth: 460,
    backgroundColor: '#f7fcf4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bdd8b6',
    padding: 20
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f4d2a'
  },
  zoneName: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  infoLine: {
    color: '#2f3f34',
    marginBottom: 3
  },
  metricsBlock: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d4e7cf',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f0f9ec'
  },
  metricLine: {
    color: '#2f3f34',
    marginBottom: 3
  },
  sensorList: {
    color: '#14532d',
    marginTop: 5,
    fontWeight: '600'
  },
  emptyText: {
    marginTop: 10,
    color: '#365643'
  },
  closeButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#166534',
    alignItems: 'center'
  },
  closeText: { color: '#fff', fontWeight: '700' }
});
