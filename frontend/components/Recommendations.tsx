import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recommendation, RecommendationTimelineStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  recommendations: Recommendation[];
}

const levelColorMap: Record<Recommendation['level'], string> = {
  critical: '#FF4D4D',
  warning: '#FFB02E',
  plan: '#38BDF8',
  premium: '#00F59B'
};

const levelLabelKeyMap = {
  critical: 'critical',
  warning: 'warning',
  plan: 'plan',
  premium: 'premiumInsight'
} as const;

const statusColorMap: Record<RecommendationTimelineStatus, string> = {
  pending: '#b45309',
  inProgress: '#166534',
  done: '#0f766e'
};

export default function Recommendations({ recommendations }: Props) {
  const { t } = useTranslation();

  const [checkedByStepId, setCheckedByStepId] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    recommendations.forEach((recommendation) => {
      recommendation.timeline.forEach((step) => {
        initial[step.id] = step.completed;
      });
    });
    return initial;
  });

  const toggleStep = (stepId: string) => {
    setCheckedByStepId((previous) => ({
      ...previous,
      [stepId]: !previous[stepId]
    }));
  };

  const getTimelineStatus = (recommendation: Recommendation): RecommendationTimelineStatus => {
    const completedCount = recommendation.timeline.filter((step) => checkedByStepId[step.id]).length;

    if (completedCount === 0) return 'pending';
    if (completedCount === recommendation.timeline.length) return 'done';
    return 'inProgress';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('recommendations')}</Text>
      {recommendations.map((item) => {
        const status = getTimelineStatus(item);

        return (
          <View key={item.id} style={styles.item}>
            <View style={[styles.statusStrip, { backgroundColor: levelColorMap[item.level] }]} />
            <View style={styles.itemHeaderRow}>
              <View style={styles.badgeRow}>
                <Text style={styles.level}>{t(levelLabelKeyMap[item.level])}</Text>
                {item.level === 'premium' && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI INSIGHT</Text>
                  </View>
                )}
              </View>
              <View style={[styles.statePill, { borderColor: statusColorMap[status] }]}>
                <Text style={[styles.stateText, { color: statusColorMap[status] }]}>{t(status)}</Text>
              </View>
            </View>

            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.message}>{t(item.messageKey)}</Text>

            <Text style={styles.timelineLabel}>{t('timeline')}</Text>
            <View>
              {item.timeline.map((step) => {
                const isChecked = !!checkedByStepId[step.id];

                return (
                  <TouchableOpacity key={step.id} style={styles.timelineItem} onPress={() => toggleStep(step.id)}>
                    <View style={[styles.checkbox, isChecked ? styles.checkboxActive : undefined]}>
                      <Text style={styles.checkboxText}>{isChecked ? '✓' : ''}</Text>
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text
                        style={[
                          styles.timelineText,
                          isChecked ? styles.timelineTextDone : undefined,
                          isChecked ? styles.timelineDimmed : undefined
                        ]}
                      >
                        {t(step.labelKey)}
                      </Text>
                      <Text style={[styles.timelineDue, isChecked ? styles.timelineDimmed : undefined]}>
                        {t('due')}: {step.dueAt}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: '#0A0F14',
    padding: 0
  },
  header: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 20,
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  item: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#00F59B',
    shadowOpacity: 0.03,
    shadowRadius: 20
  },
  statusStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  level: {
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.2
  },
  aiBadge: {
    backgroundColor: 'rgba(0, 245, 155, 0.1)',
    borderColor: 'rgba(0, 245, 155, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00F59B',
    letterSpacing: 1
  },
  title: {
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 8,
    color: '#FFFFFF'
  },
  message: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  statePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  stateText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxActive: {
    backgroundColor: '#00F59B',
    borderColor: '#00F59B'
  },
  checkboxText: {
    color: '#0A0F14',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 16
  },
  timelineTextWrap: {
    flex: 1,
    paddingTop: 1
  },
  timelineText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600'
  },
  timelineTextDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.2)'
  },
  timelineDue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 2
  },
  timelineDimmed: {
    opacity: 0.5
  }
});
