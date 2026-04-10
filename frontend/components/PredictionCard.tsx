import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Prediction } from '../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface Props {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = isDark 
    ? { 
        bg: '#111111', 
        text: '#FFFFFF', 
        subText: '#94A3B8', 
        border: '#222222',
        accent: '#10B981',
        divider: '#222222',
        barBg: '#050505'
      }
    : { 
        bg: '#FFFFFF', 
        text: '#020617', 
        subText: '#475569', 
        border: '#94A3B8',
        accent: '#059669',
        divider: '#CBD5E1',
        barBg: '#F1F5F9'
      };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border, shadowColor: isDark ? '#000' : '#E2E8F0' }]}>
      <View style={styles.header}>
        <View style={styles.aiBadgeContainer}>
          <View style={[styles.aiBadge, prediction.isHistorical && styles.historicalBadge, { backgroundColor: prediction.isHistorical ? '#6B7280' : colors.accent }]}>
            <Text style={[styles.aiBadgeText, { color: isDark || prediction.isHistorical ? '#052A1D' : '#FFFFFF' }]}>
              {prediction.isHistorical ? 'HISTORICAL DATA' : t('aiPrediction')}
            </Text>
          </View>
          {prediction.isHistorical && (
            <View style={styles.archiveTag}>
              <Text style={styles.archiveTagText}>-{prediction.historicalDate}d</Text>
            </View>
          )}
        </View>
        <Text style={[styles.updateTime, { color: colors.subText }]}>
          {prediction.isHistorical 
            ? `${prediction.historicalDate} ${t('daysAgo')}`
            : `${t('lastUpdated')}: ${new Date(prediction.lastUpdated).toLocaleDateString()}`}
        </Text>
      </View>

      <View style={styles.mainInfo}>
        <View style={styles.infoCol}>
          <Text style={[styles.label, { color: colors.subText }]}>{t('cropRecommendation')}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{t(prediction.cropRecommendation)}</Text>
          <View style={[styles.confidenceBar, { backgroundColor: colors.barBg }]}>
            <View 
              style={[
                styles.confidenceProgress, 
                { width: `${prediction.cropConfidence * 100}%`, backgroundColor: colors.accent }
              ]} 
            />
            <Text style={[styles.confidenceText, { color: colors.accent }]}>
              {(prediction.cropConfidence * 100).toFixed(0)}% {t('confidence')}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.infoCol}>
          <Text style={[styles.label, { color: colors.subText }]}>{t('fertilizerRecommendation')}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{t(prediction.fertilizerRecommendation)}</Text>
          <View style={[styles.sourceTag, { backgroundColor: colors.barBg, borderColor: colors.divider }]}>
            <Text style={[styles.sourceText, { color: colors.subText }]}>
              {prediction.fertilizerSource === 'ml' ? t('mlEngine') : t('ruleBased')}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <Text style={[styles.soilStateLabel, { color: colors.subText }]}>{t('soilState')}:</Text>
        <Text style={[styles.soilStateValue, { color: colors.text }]}>{t(prediction.soilState)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiBadge: {
    backgroundColor: '#05F59B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiBadgeText: {
    color: '#052A1D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historicalBadge: {
    backgroundColor: '#6B7280',
  },
  archiveTag: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  archiveTagText: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  updateTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  infoCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    position: 'relative',
    marginTop: 10,
  },
  confidenceProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#05F59B',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 10,
    color: '#05F59B',
    fontWeight: '800',
    marginTop: 8,
  },
  sourceTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  soilStateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '700',
    marginRight: 8,
  },
  soilStateValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
  },
});
