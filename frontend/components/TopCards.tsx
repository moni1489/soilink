
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatisticCard } from '../types';
import { useTranslation } from 'react-i18next';

interface Props { stats: StatisticCard[]; }

export default function TopCards({ stats }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <Text style={styles.label}>{t(stat.label)}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between'
  },
  card: {
    minWidth: '45%',
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    margin: 4
  },
  label: { fontSize: 12, color: '#777', marginBottom: 6, fontWeight:'600' },
  value: { fontSize: 18, fontWeight: '800', color: '#1f2937' }
});
