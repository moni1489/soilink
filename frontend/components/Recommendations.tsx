import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recommendation, RecommendationTimelineStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  recommendations: Recommendation[];
}

const levelColorMap: Record<Recommendation['level'], string> = {
  critical: '#fee2e2',
  warning: '#fef3c7',
  plan: '#dcfce7',
  premium: '#d1fae5'
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
          <View key={item.id} style={[styles.item, { backgroundColor: levelColorMap[item.level] }]}> 
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
                      <Text style={[styles.timelineText, isChecked ? styles.timelineTextDone : undefined]}>
                        {t(step.labelKey)}
                      </Text>
                      <Text style={styles.timelineDue}>
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
    width: 310,
    maxWidth: '100%',
    backgroundColor: '#f4fbf2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b7d4b1',
    padding: 10
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1f4d2a'
  },
  item: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 101, 52, 0.14)',
    elevation: 1
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  level: {
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 4,
    color: '#1f2937'
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
    color: '#1f2937'
  },
  message: {
    color: '#374151',
    fontSize: 12,
    marginBottom: 8
  },
  statePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ffffffaa'
  },
  stateText: {
    fontSize: 11,
    fontWeight: '700'
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937'
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
    borderColor: '#86b38f',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  checkboxActive: {
    backgroundColor: '#166534',
    borderColor: '#166534'
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
