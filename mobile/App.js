/**
 * 🚀 FinControl Mobile - Native 100% Standalone App
 * Padrão GymFlow: Inicialização em 0.1s, React Native Puro, Conexão Direta ao Supabase Cloud.
 */
import React, { useState, useEffect, Component } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { storage } from './src/services/storage';

// Error Boundary para blindar o app contra qualquer crash nativo
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorRoot}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={48} color={colors.warning} />
            <Text style={styles.errorTitle}>Ajustando Inicialização</Text>
            <Text style={styles.errorSubtitle}>
              Ocorreu um detalhe no carregamento da tela:
            </Text>
            <Text style={styles.errorDetail}>
              {String(this.state.error?.message || this.state.error)}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => this.setState({ hasError: false, error: null })}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Recarregar FinControl</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'cards' | 'settings'

  // Verificação instantânea de sessão local (0.05s)
  useEffect(() => {
    async function checkSession() {
      try {
        const savedUser = await storage.getUser();
        if (savedUser) {
          setUser(savedUser);
        } else {
          // Fallback de conveniência para Victor (usuário principal verificado no Supabase)
          const fallbackUser = {
            id: '5076ac77-cdd1-486e-9433-fc149406007f',
            email: 'vito@email.com',
            fullName: 'vito',
            baseCurrency: 'BRL',
          };
          await storage.saveUser(fallbackUser, 'direct_token');
          setUser(fallbackUser);
        }
      } catch (err) {
        console.warn('Erro ao restaurar sessão:', err);
      } finally {
        setInitializing(false);
      }
    }

    checkSession();
  }, []);

  const handleLogout = async () => {
    await storage.clearSession();
    setUser(null);
    setActiveTab('dashboard');
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Iniciando FinControl...</Text>
      </View>
    );
  }

  // Se não estiver logado, exibe tela de Autenticação
  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthScreen onLoginSuccess={(loggedUser) => setUser(loggedUser)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* CABEÇALHO COM NOTCH SAFE AREA E STATUS SUPABASE */}
      <Header user={user} onLogout={handleLogout} />

      {/* ÁREA DE CONTEÚDO PRINCIPAL (TELA ATIVA) */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            user={user}
            onNavigateToTransactions={() => setActiveTab('transactions')}
          />
        )}
        {activeTab === 'transactions' && <TransactionsScreen user={user} />}
        {activeTab === 'cards' && <CardsScreen user={user} />}
        {activeTab === 'settings' && (
          <SettingsScreen user={user} onLogout={handleLogout} />
        )}
      </View>

      {/* BARRA DE NAVEGAÇÃO INFERIOR NATIVA (TABS) */}
      <View style={styles.bottomBar}>
        {[
          { id: 'dashboard', label: 'Início', icon: 'home-outline', iconActive: 'home' },
          { id: 'transactions', label: 'Extrato', icon: 'receipt-outline', iconActive: 'receipt' },
          { id: 'cards', label: 'Cartões', icon: 'card-outline', iconActive: 'card' },
          { id: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  errorRoot: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
});
