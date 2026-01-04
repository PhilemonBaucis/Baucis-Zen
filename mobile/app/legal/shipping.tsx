import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';

const STORE_URL = process.env.EXPO_PUBLIC_STORE_URL || 'https://bauciszen.com';

export default function ShippingScreen() {
  const { currentLanguage: locale } = useLocale();
  const [isLoading, setIsLoading] = useState(true);

  const url = `${STORE_URL}/${locale}/legal/shipping`;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center z-10 bg-white dark:bg-gray-900">
          <ActivityIndicator size="large" color="#7ca163" />
        </View>
      )}
      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setIsLoading(false)}
        className="flex-1"
        startInLoadingState={true}
        showsVerticalScrollIndicator={true}
        style={{ flex: 1 }}
        injectedJavaScript={`
          // Hide header and footer for cleaner mobile view
          const style = document.createElement('style');
          style.textContent = \`
            header, footer, nav { display: none !important; }
            main { padding-top: 0 !important; }
          \`;
          document.head.appendChild(style);
          true;
        `}
      />
    </View>
  );
}
