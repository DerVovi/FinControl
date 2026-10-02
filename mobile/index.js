import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import { notificationListenerService } from './src/services/notificationListenerService';
import App from './App';

/**
 * ⚡ FinControl Mobile - Android Native Background Headless Task
 * Executado nativamente pelo Android quando uma notificação de compra (Google Wallet, Nubank, Itaú, etc.)
 * chega no celular, mesmo com o app fechado ou em segundo plano.
 */
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => async ({ notification }) => {
    try {
      if (notification) {
        await notificationListenerService.handleIncomingNotification(notification);
      }
    } catch (err) {
      console.error('[HeadlessTask] Falha ao processar notificação em background:', err);
    }
  }
);

registerRootComponent(App);
