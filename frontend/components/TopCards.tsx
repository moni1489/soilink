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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#00F59B',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  value: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  sparklineRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32
  },
  sparklineBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#00F59B'
  },
  signalRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5
  },
  signalBar: {
    width: 8,
    height: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  signalBarActive: {
    backgroundColor: '#00F59B'
  }
});
