const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withAndroidNotificationListener = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // 1. Garante namespace tools no manifest
    AndroidConfig.Manifest.ensureToolsAvailable(androidManifest);

    // 2. Adiciona permissões essenciais de background e boot
    const permissionsToAdd = [
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    AndroidConfig.Permissions.ensurePermissions(androidManifest, permissionsToAdd);

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // 3. Resolve conflito de manifest merge com a biblioteca (tools:replace="android:allowBackup")
    const currentReplace = mainApplication.$['tools:replace'];
    if (!currentReplace) {
      mainApplication.$['tools:replace'] = 'android:allowBackup';
    } else if (!currentReplace.includes('android:allowBackup')) {
      mainApplication.$['tools:replace'] = `${currentReplace},android:allowBackup`;
    }

    // 4. Declaração explícita do NotificationListenerService
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const listenerServiceName = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';
    const headlessServiceName = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService';

    const hasListenerService = mainApplication.service.some(
      (s) => s.$ && s.$['android:name'] === listenerServiceName
    );

    if (!hasListenerService) {
      mainApplication.service.push({
        $: {
          'android:name': listenerServiceName,
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    const hasHeadlessService = mainApplication.service.some(
      (s) => s.$ && s.$['android:name'] === headlessServiceName
    );

    if (!hasHeadlessService) {
      mainApplication.service.push({
        $: {
          'android:name': headlessServiceName,
        },
      });
    }

    // 5. Receptor de Boot para religar o serviço após reiniciar o celular
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const bootReceiverName = 'com.lesimoes.androidnotificationlistener.BootUpReceiver';
    const hasBootReceiver = mainApplication.receiver.some(
      (r) => r.$ && r.$['android:name'] === bootReceiverName
    );

    if (!hasBootReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': bootReceiverName,
          'android:enabled': 'true',
          'android:exported': 'true',
          'android:permission': 'android.permission.RECEIVE_BOOT_COMPLETED',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.BOOT_COMPLETED',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.DEFAULT',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withAndroidNotificationListener;
