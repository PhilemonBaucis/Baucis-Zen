import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleAuth } = useOAuth({ strategy: 'oauth_apple' });
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSignIn = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.errors?.[0]?.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError('');

    try {
      const startAuth = provider === 'google' ? startGoogleAuth : startAppleAuth;
      const { createdSessionId, setActive: setOAuthActive } = await startAuth();

      if (createdSessionId) {
        await setOAuthActive!({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error(`${provider} sign in error:`, err);
      setError(`Failed to sign in with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-gray-900"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12">
        {/* Logo */}
        <View className="items-center mb-8">
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ height: 60, width: 200, marginBottom: 16 }}
            resizeMode="contain"
            accessibilityLabel="Baucis Zen"
          />
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</Text>
          <Text className="text-gray-500 mt-1">Sign in to your account</Text>
        </View>

        {/* OAuth Buttons */}
        <View className="gap-3 mb-6">
          <Pressable
            onPress={() => handleOAuthSignIn('google')}
            disabled={isLoading}
            className="flex-row items-center justify-center bg-white border border-gray-300 py-3 rounded-xl"
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text className="ml-2 font-medium text-gray-700">Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => handleOAuthSignIn('apple')}
              disabled={isLoading}
              className="flex-row items-center justify-center bg-black py-3 rounded-xl"
            >
              <Ionicons name="logo-apple" size={20} color="white" />
              <Text className="ml-2 font-medium text-white">Continue with Apple</Text>
            </Pressable>
          )}
        </View>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-4 text-gray-500">or</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        {/* Email Form */}
        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {error ? (
            <Text className="text-red-500 text-sm">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleEmailSignIn}
            disabled={isLoading || !email || !password}
            className={`py-4 rounded-xl items-center ${
              isLoading || !email || !password ? 'bg-gray-300' : 'bg-primary-500'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Sign Up Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-primary-600 font-medium">Sign Up</Text>
            </Pressable>
          </Link>
        </View>

        {/* Back Button */}
        <Pressable onPress={() => router.back()} className="items-center mt-6">
          <Text className="text-gray-500">← Back to Shop</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
