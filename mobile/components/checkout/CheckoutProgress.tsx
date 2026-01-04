import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CheckoutProgressProps {
  currentStep: number; // 1 = address, 2 = shipping, 3 = payment
}

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const { t } = useTranslation();

  const steps = [
    { id: 1, label: t('checkout.address') || 'Address', icon: 'location-outline' },
    { id: 2, label: t('checkout.shipping') || 'Shipping', icon: 'car-outline' },
    { id: 3, label: t('checkout.payment') || 'Payment', icon: 'card-outline' },
  ];

  return (
    <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between">
        {steps.map((step, index) => (
          <View key={step.id} className="flex-row items-center flex-1">
            {/* Step Circle */}
            <View className="items-center flex-1">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  currentStep >= step.id
                    ? 'bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {currentStep > step.id ? (
                  <Ionicons name="checkmark" size={20} color="white" />
                ) : (
                  <Ionicons
                    name={step.icon as any}
                    size={18}
                    color={currentStep >= step.id ? 'white' : '#9ca3af'}
                  />
                )}
              </View>
              <Text
                className={`text-xs mt-1 ${
                  currentStep >= step.id
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </Text>
            </View>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View
                className={`h-0.5 flex-1 mx-2 ${
                  currentStep > step.id
                    ? 'bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                style={{ marginTop: -16 }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
