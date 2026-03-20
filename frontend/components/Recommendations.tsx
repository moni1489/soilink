import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recommendation, RecommendationTimelineStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  recommendations: Recommendation[];
}

const levelColorMap = {
  critical: '#fca5a5',
  warning: '#fde68a',
  plan: '#bfdbfe',
  premium: '#c7d2fe'
};

const levelLabelKeyMap = {
  critical: 'critical',
  warning: 'warning',
  plan: 'plan',
  premium: 'premiumInsight'
} as const;

const statusColorMap: Record<RecommendationTimelineStatus, string> = {
  pending: '#f59e0b',
  inProgress: '#2563eb',
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
          <View key={item.id} style={[styles.item, { backgroundColor: levelColorMap[item.level] || '#fff' }]}>
            <View style={styles.itemHeaderRow}>
              <Text style={styles.level}>{t(levelLabelKeyMap[item.level])}</Text>
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
                      <Text style={styles.checkboxText}>{isChecked ? 'x' : ''}</Text>
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text style={[styles.timelineText, isChecked ? styles.timelineTextDone : undefined]}>{t(step.labelKey)}</Text>
                      <Text style={styles.timelineDue}>{t('due')}: {step.dueAt}</Text>
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
    width: 300,
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10
  },
  header: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  item: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    elevation: 1
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  level: { fontWeight: '800', textTransform: 'uppercase', fontSize: 12, marginBottom: 4 },
  title: { fontWeight: '700', marginBottom: 2 },
  message: { color: '#555', fontSize: 12, marginBottom: 8 },
  statePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  stateText: {
    fontSize: 11,
    fontWeight: '700'
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9ca3af',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  checkboxActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e'
  },
  checkboxText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 11
  },
  timelineTextWrap: {
    flex: 1
  },
  timelineText: {
    fontSize: 12,
    color: '#1f2937'
  },
  timelineTextDone: {
    textDecorationLine: 'line-through',
    color: '#6b7280'
  },
  timelineDue: {
    fontSize: 11,
    color: '#6b7280'
  }
});
