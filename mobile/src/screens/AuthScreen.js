import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { api } from '../services/api';

export function AuthScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('vito@email.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const topPadding = StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 48;

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e sua senha.');
      return;
    }
    if (isRegister && !fullName) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isRegister) {
        res = await api.register(fullName, email, password);
      } else {
        res = await api.login(email, password);
      }

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Falha ao autenticar.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TOPO: TÍTULO HERO & FRASE MOTIVACIONAL */}
        <View style={styles.heroSection}>
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeText}>FINCONTROL NATIVE</Text>
          </View>
          <Text style={styles.heroTitle}>
            Seu dinheiro sob controle, <Text style={styles.heroHighlight}>de verdade.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Descubra com precisão para onde vai cada centavo e construa sua liberdade financeira sem planilhas chatas.
          </Text>
        </View>

        {/* 2. CARD DE LOGIN / CADASTRO */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isRegister ? 'Criar Nova Conta' : 'Acesse sua Conta'}
          </Text>
          <Text style={styles.formSubtitle}>
            {isRegister
              ? 'Comece agora sua jornada para a independência financeira'
              : 'Informe suas credenciais para entrar'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.expense} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Victor Silva"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button
            title={isRegister ? 'Criar Conta' : 'Entrar no FinControl'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => {
              setIsRegister(!isRegister);
              setErrorMessage('');
            }}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {isRegister
                ? 'Já tem uma conta? '
                : 'Não tem uma conta ainda? '}
              <Text style={styles.toggleHighlight}>
                {isRegister ? 'Faça login' : 'Cadastre-se grátis'}
              </Text>
            </Text>
          </TouchableOpacity>
        </Card>

        {/* 3. BLOCOS DE CONFIANÇA & SEGURANÇA ABAIXO */}
        <View style={styles.featuresSection}>
          <View style={styles.featureBadgeContainer}>
            <Badge title="GESTÃO FINANCEIRA SEM COMPLICAÇÕES" />
          </View>

          <View style={styles.featureCardsRow}>
            <Card style={styles.featureCard} elevated>
              <View style={styles.featureIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>100% Seguro</Text>
              <Text style={styles.featureDesc}>
                Isolamento estrito por usuário, criptografia e conformidade Prompt Mestre.
              </Text>
            </Card>

            <Card style={styles.featureCard} elevated>
              <View style={styles.featureIconContainer}>
                <Ionicons name="calculator" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Cálculo Preciso</Text>
              <Text style={styles.featureDesc}>
                Armazenamento em centavos inteiros eliminando erros de ponto flutuante.
              </Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 24,
  },
  appBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  appBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 36,
    marginBottom: 10,
  },
  heroHighlight: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.expenseGhost,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.expense,
  },
  errorText: {
    color: colors.expense,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  submitBtn: {
    marginTop: 8,
  },
  toggleBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  toggleHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  featuresSection: {
    marginTop: 10,
  },
  featureBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  featureCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    padding: 14,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
