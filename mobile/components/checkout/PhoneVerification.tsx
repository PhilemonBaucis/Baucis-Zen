import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useCheckoutStore } from '@/store/checkout-store';

interface PhoneVerificationProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
  defaultPhone?: string;
}

export function PhoneVerification({
  visible,
  onClose,
  onVerified,
  defaultPhone = '',
}: PhoneVerificationProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { sendPhoneVerification, verifyPhoneCode } = useCheckoutStore();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('phone');
      setCode(['', '', '', '', '', '']);
      setError(null);
      setPhone(defaultPhone);
    }
  }, [visible, defaultPhone]);

  const handleSendCode = async () => {
    if (!phone || phone.length < 8) {
      setError(t('checkout.invalidPhone') || 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const success = await sendPhoneVerification(phone, token);
      if (success) {
        setStep('code');
        setCooldown(60);
        // Focus first input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(t('checkout.sendCodeFailed') || 'Failed to send code. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (i + index < 6) {
          newCode[i + index] = digit;
        }
      });
      setCode(newCode);

      // Focus appropriate input
      const lastFilledIndex = Math.min(index + digits.length, 5);
      inputRefs.current[lastFilledIndex]?.focus();

      // Auto-verify if complete
      if (newCode.every((d) => d !== '')) {
        handleVerifyCode(newCode.join(''));
      }
    } else {
      // Single digit
      const newCode = [...code];
      newCode[index] = value.replace(/\D/g, '');
      setCode(newCode);

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify if complete
      if (newCode.every((d) => d !== '')) {
        handleVerifyCode(newCode.join(''));
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (codeString?: string) => {
    const verificationCode = codeString || code.join('');

    if (verificationCode.length !== 6) {
      setError(t('checkout.enterFullCode') || 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const success = await verifyPhoneCode(phone, verificationCode, token);
      if (success) {
        onVerified();
      } else {
        setError(t('checkout.invalidCode') || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsLoading(true);
    setError(null);
    setCode(['', '', '', '', '', '']);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const success = await sendPhoneVerification(phone, token);
      if (success) {
        setCooldown(60);
        inputRefs.current[0]?.focus();
      } else {
        setError(t('checkout.sendCodeFailed') || 'Failed to resend code');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {t('checkout.verifyPhone') || 'Verify Phone Number'}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </Pressable>
          </View>

          {step === 'phone' ? (
            <>
              {/* Phone Input Step */}
              <Text className="text-gray-600 dark:text-gray-400 mb-4">
                {t('checkout.verifyPhoneDescription') ||
                  'We need to verify your phone number for secure delivery.'}
              </Text>

              <View className="mb-4">
                <Text className="text-gray-700 dark:text-gray-300 text-sm mb-2 font-medium">
                  {t('checkout.phoneNumber') || 'Phone Number'}
                </Text>
                <TextInput
                  className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-4 text-gray-900 dark:text-white text-lg"
                  placeholder="+355 69 123 4567"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                />
              </View>

              {error && (
                <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4 flex-row items-center">
                  <Ionicons name="warning-outline" size={20} color="#ef4444" />
                  <Text className="text-red-600 dark:text-red-400 ml-2">{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSendCode}
                disabled={isLoading || !phone}
                className={`py-4 rounded-full items-center ${
                  isLoading || !phone ? 'bg-gray-300' : 'bg-primary-500'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {t('checkout.sendCode') || 'Send Verification Code'}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* Code Input Step */}
              <Text className="text-gray-600 dark:text-gray-400 mb-2">
                {t('checkout.enterCodeSent') || 'Enter the 6-digit code sent to'}
              </Text>
              <Text className="text-gray-900 dark:text-white font-semibold mb-6">
                {phone}
              </Text>

              {/* 6-Digit Input */}
              <View className="flex-row justify-between mb-4">
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    className={`w-12 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl text-center text-2xl font-bold ${
                      digit ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                    }`}
                    maxLength={6}
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={(value) => handleCodeChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  />
                ))}
              </View>

              {error && (
                <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4 flex-row items-center">
                  <Ionicons name="warning-outline" size={20} color="#ef4444" />
                  <Text className="text-red-600 dark:text-red-400 ml-2">{error}</Text>
                </View>
              )}

              {/* Resend */}
              <View className="flex-row items-center justify-center mb-4">
                <Text className="text-gray-500">
                  {t('checkout.didntReceive') || "Didn't receive the code?"}
                </Text>
                <Pressable onPress={handleResend} disabled={cooldown > 0}>
                  <Text
                    className={`ml-1 font-medium ${
                      cooldown > 0 ? 'text-gray-400' : 'text-primary-600'
                    }`}
                  >
                    {cooldown > 0
                      ? `${t('checkout.resendIn') || 'Resend in'} ${cooldown}s`
                      : t('checkout.resend') || 'Resend'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => handleVerifyCode()}
                disabled={isLoading || code.some((d) => !d)}
                className={`py-4 rounded-full items-center ${
                  isLoading || code.some((d) => !d) ? 'bg-gray-300' : 'bg-primary-500'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {t('checkout.verify') || 'Verify'}
                  </Text>
                )}
              </Pressable>

              {/* Change Number */}
              <Pressable
                onPress={() => {
                  setStep('phone');
                  setCode(['', '', '', '', '', '']);
                  setError(null);
                }}
                className="mt-3 py-2"
              >
                <Text className="text-gray-500 text-center">
                  {t('checkout.changeNumber') || 'Change phone number'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
