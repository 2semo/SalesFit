import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { authService } from '../services/authService';

export function LoginScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!employeeId.trim()) {
      setError('사번을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const email = `${employeeId.trim()}@salesfit.local`;
      const user = await authService.signIn(email, employeeId.trim());
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError('사번이 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.titleSection}>
          <Text style={styles.appTitle}>Lotte Himart SalesFit</Text>
          <Text style={styles.appSubtitle}>AI 영업 코치</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="사번 입력"
            placeholderTextColor="#6B7280"
            value={employeeId}
            onChangeText={setEmployeeId}
            autoCapitalize="none"
            keyboardType="number-pad"
            autoComplete="off"
          />

          {error !== null && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={() => void handleLogin()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 48,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  appSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
