import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

import { useTranslation } from 'react-i18next';
import { SoilDepth, SoilGridsProperty } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: {
    field: any;
    sensors: any[];
    depth: SoilDepth;
    property: SoilGridsProperty;
  };
}

export default function ChatInterface({ visible, onClose, context }: Props) {
  const { t, i18n } = useTranslation();
  if (!visible) return null;
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('aiGreeting') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          field_id: context?.field?.id || 'unknown', 
          message: userMsg,
          context: context,
          language: i18n.language
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: t('aiError') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Agronomist</Text>
            <Text style={styles.subtitle}>Powered by Groq Llama 3.3</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.msgList} contentContainerStyle={styles.msgContent}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.msgBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={styles.msgText}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.msgBubble, styles.aiBubble]}>
              <ActivityIndicator color="#00F59B" />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('askAboutSoil')}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>⮕</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#064E3B',
    overflow: 'hidden'
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#059669', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 12 },
  msgList: { flex: 1, padding: 20 },
  msgContent: { paddingBottom: 20 },
  msgBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#059669',
    borderBottomRightRadius: 4
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  msgText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  inputRow: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    height: 48
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' }
});
