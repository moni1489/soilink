import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Sensor } from '../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

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

const getStatusColor = (status: Sensor['status']) => {
  if (status === 'healthy') return '#166534';
  if (status === 'warning') return '#a16207';
  return '#b91c1c';
};

export default function SensorModal({ visible, sensor, onClose }: Props) {
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
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: '#059669' }]}>{t('sensorDetails')}</Text>
              <Text style={[styles.name, { color: colors.text }]}>{sensor.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
              <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sensor.status) }]}>
            <Text style={styles.statusBadgeText}>
              {t('status')}: {sensor.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('lastUpdated')}: <Text style={{ color: colors.text }}>{sensor.lastUpdated}</Text></Text>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('soilTemperature')}: <Text style={{ color: colors.text }}>{sensor.soilTemperature}C</Text></Text>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('soilMoistureValue')}: <Text style={{ color: colors.text }}>{sensor.soilMoisture}%</Text></Text>
            <Text style={[styles.infoLine, { color: colors.subText }]}>{t('electricalConductivityValue')}: <Text style={{ color: colors.text }}>{sensor.electricalConductivity} mS/cm</Text></Text>
          </View>

          <Text style={[styles.trendTitle, { color: colors.text }]}>{t('sensorTrends')}</Text>
          <View>
            {metrics.map((metric) => {
              const values = trendSeries[metric.key] ?? [];

              return (
                <View key={metric.key} style={[styles.trendCard, { backgroundColor: colors.cardBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}>
                  <View style={styles.trendRowTop}>
                    <Text style={[styles.trendLabel, { color: colors.subText }]}>{t(metric.labelKey)}</Text>
                    <Text style={[styles.trendValue, { color: colors.text }]}>
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
                                index === values.length - 1 ? '#059669' : isDark ? 'rgba(5,150,105,0.2)' : 'rgba(5,150,105,0.1)'
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
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 20
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  infoGrid: {
    gap: 8,
    marginBottom: 24
  },
  infoLine: {
    fontSize: 14,
    fontWeight: '600'
  },
  trendTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12
  },
  trendCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  trendRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '900'
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40
  },
  sparklineBar: {
    width: '10%',
    borderRadius: 4
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center'
  },
  closeButtonText: { color: '#fff', fontWeight: '900', textTransform: 'uppercase' }
});
