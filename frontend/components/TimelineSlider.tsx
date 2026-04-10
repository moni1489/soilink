import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onTimeChange: (daysAgo: number) => void;
  selectedDaysAgo: number;
}

const DAYS = [7, 6, 5, 4, 3, 2, 1, 0]; // 0 is Today

export default function TimelineSlider({ onTimeChange, selectedDaysAgo }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getDayLabel = (daysAgo: number) => {
    if (daysAgo === 0) return t('today') || 'Today';
    return `${daysAgo} ${t('daysAgo') || 'days ago'}`;
  };

  const colors = isDark 
    ? { 
        bg: '#000000', 
        text: '#F8FAFC', 
        subText: 'rgba(255, 255, 255, 0.3)', 
        border: 'rgba(5, 150, 105, 0.4)', 
        accent: '#05F59B',
        line: 'rgba(255, 255, 255, 0.1)'
      }
    : { 
        bg: '#FFFFFF', 
        text: '#1E293B', 
        subText: 'rgba(0, 0, 0, 0.4)', 
        border: '#E2E8F0', 
        accent: '#059669',
        line: '#F1F5F9'
      };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border, shadowColor: isDark ? '#000' : '#E2E8F0' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.subText }]}>{t('historicalTimeline') || 'Soil Condition History'}</Text>
        <Text style={[styles.currentVal, { color: colors.accent }]}>{getDayLabel(selectedDaysAgo)}</Text>
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
              <View style={[styles.dot, isActive && { backgroundColor: colors.accent }, !isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0' }, isActive && styles.dotActive]} />
              <Text style={[styles.stepLabel, { color: colors.subText }, isActive && { color: colors.text, fontWeight: '700' }]}>
                {day === 0 ? 'NOW' : `-${day}d`}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={[styles.line, { backgroundColor: colors.line }]} />
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
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
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
