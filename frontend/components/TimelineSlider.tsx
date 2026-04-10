import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  onTimeChange: (daysAgo: number) => void;
  selectedDaysAgo: number;
}

const DAYS = [7, 6, 5, 4, 3, 2, 1, 0]; // 0 is Today

export default function TimelineSlider({ onTimeChange, selectedDaysAgo }: Props) {
  const { t } = useTranslation();

  const getDayLabel = (daysAgo: number) => {
    if (daysAgo === 0) return t('today') || 'Today';
    return `${daysAgo} ${t('daysAgo') || 'days ago'}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('historicalTimeline') || 'Soil Condition History'}</Text>
        <Text style={styles.currentVal}>{getDayLabel(selectedDaysAgo)}</Text>
      </View>
      <View style={styles.track}>
        {DAYS.map((day) => {
          const isActive = day === selectedDaysAgo;
          return (
            <TouchableOpacity 
              key={day} 
              onPress={() => onTimeChange(day)}
              style={styles.stepWrapper}
            >
              <View style={[styles.dot, isActive && styles.dotActive]} />
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                {day === 0 ? 'NOW' : `-${day}d`}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    backdropFilter: 'blur(8px)',
  } as any,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentVal: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  track: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    height: 30,
    paddingHorizontal: 4,
  },
  line: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 15,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: -1,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: '#059669',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: '800',
  },
  stepLabelActive: {
    color: '#FFFFFF',
  },
});
