import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatisticCard } from '../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface Props {
  stats: StatisticCard[];
}

export default function TopCards({ stats }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const sparkline = [48, 52, 54, 57, 58, 63, 60, 66, 70, 72, 74, 77];

  const colors = isDark 
    ? { 
        cardBg: '#050505', 
        text: '#FFFFFF', 
        subText: '#94A3B8', 
        border: '#222222',
        accent: '#10B981'
      }
    : { 
        cardBg: '#FFFFFF', 
        text: '#020617', 
        subText: '#475569', 
        border: '#E2E8F0',
        accent: '#059669'
      };

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, shadowColor: isDark ? '#000' : '#E2E8F0' }]}>
          <Text style={[styles.label, { color: colors.subText }]}>{t(stat.label)}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
          {stat.id === 'stats-soil' ? (
            <View style={styles.sparklineRow}>
              {sparkline.map((point, index) => (
                <View
                  key={`${stat.id}-${index}`}
                  style={[styles.sparklineBar, { height: Math.max(8, (point / 80) * 26), backgroundColor: colors.accent }]}
                />
              ))}
            </View>
          ) : null}
          {stat.id === 'stats-sensors' ? (
            <View style={styles.signalRow}>
              {[1, 2, 3, 4, 5].map((bar) => (
                <View
                  key={`${stat.id}-signal-${bar}`}
                  style={[styles.signalBar, bar <= Number(stat.value) ? { backgroundColor: colors.accent } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
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
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
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
