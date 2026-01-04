import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleAuth } = useOAuth({ strategy: 'oauth_apple' });
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.errors?.[0]?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'apple') => {
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
      console.error(`${provider} sign up error:`, err);
      setError(`Failed to sign up with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white dark:bg-gray-900"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
              <Ionicons name="mail" size={40} color="#7ca163" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">Check Your Email</Text>
            <Text className="text-gray-500 text-center mt-2">
              We sent a verification code to {email}
            </Text>
          </View>

          <View className="gap-4">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Enter verification code"
              keyboardType="number-pad"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-center text-2xl tracking-widest"
              placeholderTextColor="#9ca3af"
              maxLength={6}
            />

            {error ? (
              <Text className="text-red-500 text-sm text-center">{error}</Text>
            ) : null}

            <Pressable
              onPress={handleVerification}
              disabled={isLoading || code.length < 6}
              className={`py-4 rounded-xl items-center ${
                isLoading || code.length < 6 ? 'bg-gray-300' : 'bg-primary-500'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Verify Email</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</Text>
          <Text className="text-gray-500 mt-1">Join and earn 50 bonus points!</Text>
        </View>

        {/* OAuth Buttons */}
        <View className="gap-3 mb-6">
          <Pressable
            onPress={() => handleOAuthSignUp('google')}
            disabled={isLoading}
            className="flex-row items-center justify-center bg-white border border-gray-300 py-3 rounded-xl"
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text className="ml-2 font-medium text-gray-700">Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => handleOAuthSignUp('apple')}
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
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

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
              placeholder="Min. 8 characters"
              secureTextEntry
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {error ? (
            <Text className="text-red-500 text-sm">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignUp}
            disabled={isLoading || !email || !password}
            className={`py-4 rounded-xl items-center ${
              isLoading || !email || !password ? 'bg-gray-300' : 'bg-primary-500'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Create Account</Text>
            )}
          </Pressable>
        </View>

        {/* Sign In Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-primary-600 font-medium">Sign In</Text>
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
