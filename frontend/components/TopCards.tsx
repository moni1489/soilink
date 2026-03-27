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
    marginBottom: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between'
  },
  card: {
    minWidth: '45%',
    flex: 1,
    backgroundColor: '#16191E',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
    margin: 4
  },
  label: {
    fontSize: 11,
    color: '#93A1B2',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F4F7FA'
  },
  sparklineRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 30
  },
  sparklineBar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: '#38BDF8'
  },
  signalRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4
  },
  signalBar: {
    width: 7,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#2A303A'
  },
  signalBarActive: {
    backgroundColor: '#00F59B'
  }
});
