import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sensor } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  sensor: Sensor | null;
  onClose: () => void;
}

interface TrendMetric {
  key: string;
  labelKey: string;
  unit: string;
  value: number;
  min: number;
  max: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const seedFrom = (input: string) =>
  input
    .split('')
    .reduce((accumulator, character, index) => accumulator + character.charCodeAt(0) * (index + 1), 0);

const generateTrendValues = (seed: number, currentValue: number, min: number, max: number) => {
  const amplitude = (max - min) * 0.12;

  return Array.from({ length: 8 }, (_, index) => {
    const harmonic = Math.sin((seed % 13) * 0.25 + index * 0.95) * amplitude;
    const drift = ((seed % 7) - 3) * 0.015 * (max - min);
    const isLastPoint = index === 7;
    const baseline = isLastPoint ? currentValue : currentValue + harmonic + drift;

    return clamp(baseline, min, max);
  });
};

const statusColor = (status: Sensor['status']) => {
  if (status === 'healthy') return '#166534';
  if (status === 'warning') return '#a16207';
  return '#b91c1c';
};

export default function SensorModal({ visible, sensor, onClose }: Props) {
  const { t } = useTranslation();

  const metrics: TrendMetric[] = useMemo(() => {
    if (!sensor) return [];

    return [
      {
        key: 'soilMoisture',
        labelKey: 'soilMoistureValue',
        unit: '%',
        value: sensor.soilMoisture,
        min: 0,
        max: 100
      },
      {
        key: 'soilTemperature',
        labelKey: 'soilTemperature',
        unit: 'C',
        value: sensor.soilTemperature,
        min: -5,
        max: 40
      },
      { key: 'pH', labelKey: 'pH', unit: '', value: sensor.pH, min: 3.5, max: 8.5 },
      {
        key: 'electricalConductivity',
        labelKey: 'electricalConductivityValue',
        unit: 'mS/cm',
        value: sensor.electricalConductivity,
        min: 0.2,
        max: 3
      }
    ];
  }, [sensor]);

  const trendSeries = useMemo(() => {
    if (!sensor) return {} as Record<string, number[]>;

    return metrics.reduce<Record<string, number[]>>((collection, metric) => {
      collection[metric.key] = generateTrendValues(
        seedFrom(`${sensor.id}-${metric.key}`),
        metric.value,
        metric.min,
        metric.max
      );
      return collection;
    }, {});
  }, [metrics, sensor]);

  if (!sensor) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('sensorDetails')}</Text>
          <Text style={styles.name}>{sensor.name}</Text>

          <View style={[styles.statusBadge, { backgroundColor: statusColor(sensor.status) }]}>
            <Text style={styles.statusBadgeText}>
              {t('status')}: {sensor.status.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.infoLine}>
            {t('lastUpdated')}: {sensor.lastUpdated}
          </Text>
          <Text style={styles.infoLine}>
            {t('soilTemperature')}: {sensor.soilTemperature}C
          </Text>
          <Text style={styles.infoLine}>
            {t('soilMoistureValue')}: {sensor.soilMoisture}%
          </Text>
          <Text style={styles.infoLine}>
            {t('electricalConductivityValue')}: {sensor.electricalConductivity} mS/cm
          </Text>
          <Text style={styles.infoLine}>
            {t('gasCompositionValue')}: {sensor.gasComposition}
          </Text>


          <Text style={styles.trendTitle}>{t('sensorTrends')}</Text>
          <View>
            {metrics.map((metric) => {
              const values = trendSeries[metric.key] ?? [];

              return (
                <View key={metric.key} style={styles.trendCard}>
                  <View style={styles.trendRowTop}>
                    <Text style={styles.trendLabel}>{t(metric.labelKey)}</Text>
                    <Text style={styles.trendValue}>
                      {metric.value.toFixed(metric.key === 'pH' ? 1 : 0)}
                      {metric.unit}
                    </Text>
                  </View>

                  <View style={styles.sparklineRow}>
                    {values.map((value, index) => {
                      const normalized = clamp((value - metric.min) / (metric.max - metric.min), 0.05, 1);

                      return (
                        <View
                          key={`${metric.key}-${index}`}
                          style={[
                            styles.sparklineBar,
                            {
                              height: 10 + normalized * 30,
                              backgroundColor:
                                index === values.length - 1 ? '#166534' : 'rgba(34,197,94,0.44)'
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

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
  name: {
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
    marginBottom: 2
  },
  premiumLine: {
    color: '#14532d',
    marginTop: 6,
    marginBottom: 2,
    fontWeight: '600'
  },
  trendTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '700',
    color: '#1f4d2a'
  },
  trendCard: {
    borderWidth: 1,
    borderColor: '#d4e7cf',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#f0f9ec'
  },
  trendRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  trendLabel: {
    fontSize: 12,
    color: '#375744',
    fontWeight: '600'
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532d'
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 42
  },
  sparklineBar: {
    width: 12,
    borderRadius: 6
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
