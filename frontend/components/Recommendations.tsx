import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Recommendation, RecommendationTimelineStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  recommendations: Recommendation[];
}

const levelColorMap: Record<Recommendation['level'], string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  plan: '#6366F1',
  premium: '#059669'
};

const levelLabelKeyMap = {
  critical: 'critical',
  warning: 'warning',
  plan: 'plan',
  premium: 'premiumInsight'
} as const;

const statusColorMap: Record<RecommendationTimelineStatus, string> = {
  pending: '#D97706',
  inProgress: '#059669',
  done: '#065F46'
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
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 340,
    backgroundColor: '#000000',
    padding: 0
  },
  header: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 20,
    color: 'rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  item: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  statusStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3
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
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 1.2
  },
  aiBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: 'rgba(5, 150, 105, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  aiBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 6,
    color: '#FFFFFF'
  },
  message: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20
  },
  statePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  stateText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  checkboxText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 10,
  },
  timelineTextWrap: {
    flex: 1,
    paddingTop: 0
  },
  timelineText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600'
  },
  timelineTextDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.2)'
  },
  timelineDue: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.25)',
    marginTop: 2
  },
  timelineDimmed: {
    opacity: 0.5
  }
});
