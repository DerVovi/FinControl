import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StatusBar,
  BackHandler,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';

// URL inicial padrão do FinControl (Produção 24/7 na Nuvem Render)
const DEFAULT_URL = 'https://fincontrolw.onrender.com';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef(null);

  // Permite botão Voltar do Android navegar no histórico da Web
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, []);

  const handleSaveUrl = () => {
    let clean = inputUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setCurrentUrl(clean);
    setShowConfig(false);
    setHasError(false);
    setLoading(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" translucent={false} />

      {/* Barra superior de controle rápido */}
      <View style={styles.headerBar}>
        <View style={styles.headerBrand}>
          <Text style={styles.headerTitle}>
            Fin<Text style={styles.headerHighlight}>Control</Text>
          </Text>
          <Text style={styles.headerBadge}>Android Native</Text>
        </View>
        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configBtnText}>{showConfig ? 'Fechar' : '⚙️ Servidor'}</Text>
        </TouchableOpacity>
      </View>

      {/* Painel expansível de configuração da URL do servidor */}
      {showConfig && (
        <View style={styles.configPanel}>
          <Text style={styles.configLabel}>Endereço do Servidor FinControl:</Text>
          <TextInput
            style={styles.urlInput}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="https://...trycloudflare.com ou http://192.168.15.7:5173"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
              <Text style={styles.saveBtnText}>Conectar Servidor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setInputUrl(DEFAULT_URL);
                setCurrentUrl(DEFAULT_URL);
                setShowConfig(false);
              }}
            >
              <Text style={styles.resetBtnText}>Restaurar Padrão</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* WebView com FinControl */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webView}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          allowsBackForwardNavigationGestures={true}
        />

        {/* Indicador de carregamento */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Conectando ao FinControl...</Text>
          </View>
        )}

        {/* Tela de Erro de Conexão com botão de tentar novamente */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Não foi possível conectar ao servidor</Text>
            <Text style={styles.errorSubtitle}>
              Verifique se o seu computador está ligado e o túnel do FinControl ativo.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setHasError(false);
                setLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryBtnText}>Tentar Novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.changeUrlBtn}
              onPress={() => setShowConfig(true)}
            >
              <Text style={styles.changeUrlBtnText}>Alterar Endereço do Servidor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  headerBar: {
    minHeight: 52,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerHighlight: {
    color: '#10b981',
  },
  headerBadge: {
    fontSize: 10,
    backgroundColor: '#064e3b',
    color: '#6ee7b7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#059669',
    fontWeight: 'bold',
  },
  configBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  configBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  configPanel: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  configLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  urlInput: {
    backgroundColor: '#020617',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  configActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  resetBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  errorSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  changeUrlBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeUrlBtnText: {
    color: '#38bdf8',
    fontSize: 12,
  },
});
