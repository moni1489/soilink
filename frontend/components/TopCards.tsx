import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatisticCard } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  stats: StatisticCard[];
}

export default function TopCards({ stats }: Props) {
  const { t } = useTranslation();
  const sparkline = [48, 52, 54, 57, 58, 63, 60, 66, 70, 72, 74, 77];

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <Text style={styles.label}>{t(stat.label)}</Text>
          <Text style={styles.value}>{stat.value}</Text>
          {stat.id === 'stats-soil' ? (
            <View style={styles.sparklineRow}>
              {sparkline.map((point, index) => (
                <View
                  key={`${stat.id}-${index}`}
                  style={[styles.sparklineBar, { height: Math.max(8, (point / 80) * 26) }]}
                />
              ))}
            </View>
          ) : null}
          {stat.id === 'stats-sensors' ? (
            <View style={styles.signalRow}>
              {[1, 2, 3, 4, 5].map((bar) => (
                <View
                  key={`${stat.id}-signal-${bar}`}
                  style={[styles.signalBar, bar <= Number(stat.value) ? styles.signalBarActive : undefined]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between'
  },
  card: {
    minWidth: '22%',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(5, 245, 155, 0.1)',
  },
  label: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  sparklineRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24
  },
  sparklineBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#059669'
  },
  signalRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4
  },
  signalBar: {
    width: 6,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  signalBarActive: {
    backgroundColor: '#059669'
  }
});
