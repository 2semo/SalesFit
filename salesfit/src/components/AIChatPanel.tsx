import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { geminiService } from '../services/geminiService';
import type { ChatMessage } from '../types';

interface AIChatPanelProps {
  visible: boolean;
  onClose: () => void;
  consultationContext: string;
}

export function AIChatPanel({ visible, onClose, consultationContext }: AIChatPanelProps): React.JSX.Element | null {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'ai',
          text: '안녕하세요 매니저님! 상담 내용에 대해 궁금한 점이나 의견이 있으시면 말씀해 주세요. 고객에게 맞는 모델 추천, 멘트 제안, 상담 전략 등 무엇이든 함께 논의할 수 있습니다.',
          timestamp: Date.now(),
        }]);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await geminiService.chat(text, consultationContext);

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      text: response,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 AI 코치와 대화</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>
              {msg.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.aiBubble}>
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="궁금한 점을 입력하세요..."
            placeholderTextColor="#6B7280"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => void handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 480,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#3C3C3C',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerTitle: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    color: '#6B7280',
    fontSize: 16,
    padding: 4,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A9EFF',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2C2C2C',
    minWidth: 48,
    alignItems: 'flex-start',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#E5E7EB',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#4A9EFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
