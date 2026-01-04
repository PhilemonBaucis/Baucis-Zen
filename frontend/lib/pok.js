/**
 * POK Pay Frontend Helpers
 *
 * Handles POK payment flow on the frontend:
 * 1. Create SDK Order
 * 2. Tokenize card
 * 3. Check 3DS enrollment
 * 4. Handle 3DS authentication
 * 5. Confirm payment
 */

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * Create a POK SDK Order for the cart
 *
 * @param {string} cartId - Medusa cart ID
 * @returns {Promise<{ success: boolean, sdk_order_id?: string, error?: string }>}
 */
export async function createPokOrder(cartId) {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/pok/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ cart_id: cartId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to create POK order',
      };
    }

    return {
      success: true,
      sdk_order_id: data.sdk_order_id,
      amount: data.amount,
      currency: data.currency,
      expires_at: data.expires_at,
    };
  } catch (error) {
    console.error('[POK] Create order error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Tokenize a credit/debit card
 *
 * @param {Object} cardData - Card details
 * @param {string} cardData.cardNumber - Full card number
 * @param {string} cardData.expiryMonth - 2-digit month (01-12)
 * @param {string} cardData.expiryYear - 2 or 4 digit year
 * @param {string} cardData.cvv - CVV code
 * @param {string} cardData.holderName - Cardholder name
 * @returns {Promise<{ success: boolean, credit_card_id?: string, error?: string }>}
 */
export async function tokenizeCard(cardData) {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/pok/tokenize-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        card_number: cardData.cardNumber,
        expiry_month: cardData.expiryMonth,
        expiry_year: cardData.expiryYear,
        cvv: cardData.cvv,
        holder_name: cardData.holderName,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Card validation failed',
      };
    }

    return {
      success: true,
      credit_card_id: data.credit_card_id,
      last4: data.last4,
      brand: data.brand,
    };
  } catch (error) {
    console.error('[POK] Tokenize card error:', error);
    return {
      success: false,
      error: 'Failed to process card. Please try again.',
    };
  }
}

/**
 * Check 3DS enrollment for a card
 *
 * @param {string} cartId - Medusa cart ID
 * @param {string} creditCardId - Tokenized card ID
 * @param {string} sdkOrderId - POK SDK order ID
 * @returns {Promise<{ success: boolean, requires_3ds?: boolean, step_up?: object, error?: string }>}
 */
export async function check3dsEnrollment(cartId, creditCardId, sdkOrderId) {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/pok/check-3ds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        cart_id: cartId,
        credit_card_id: creditCardId,
        sdk_order_id: sdkOrderId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || '3DS check failed',
      };
    }

    return {
      success: true,
      requires_3ds: data.requires_3ds,
      status: data.status,
      step_up: data.step_up,
    };
  } catch (error) {
    console.error('[POK] 3DS check error:', error);
    return {
      success: false,
      error: 'Failed to verify card. Please try again.',
    };
  }
}

/**
 * Confirm POK payment
 *
 * @param {string} cartId - Medusa cart ID
 * @param {string} creditCardId - Tokenized card ID
 * @param {string} sdkOrderId - POK SDK order ID
 * @param {Object} consumerAuthInfo - 3DS authentication info (optional)
 * @returns {Promise<{ success: boolean, transaction_id?: string, error?: string }>}
 */
export async function confirmPokPayment(cartId, creditCardId, sdkOrderId, consumerAuthInfo = null) {
  try {
    const body = {
      cart_id: cartId,
      credit_card_id: creditCardId,
      sdk_order_id: sdkOrderId,
    };

    if (consumerAuthInfo) {
      body.consumer_auth_info = consumerAuthInfo;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/pok/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Payment failed',
      };
    }

    return {
      success: true,
      transaction_id: data.transaction_id,
      sdk_order_id: data.sdk_order_id,
    };
  } catch (error) {
    console.error('[POK] Confirm payment error:', error);
    return {
      success: false,
      error: 'Payment confirmation failed. Please try again.',
    };
  }
}

/**
 * Process full POK payment flow
 *
 * @param {string} cartId - Medusa cart ID
 * @param {Object} cardData - Card details
 * @param {Function} onStepChange - Callback for step changes
 * @param {Function} on3dsRequired - Callback when 3DS is required
 * @returns {Promise<{ success: boolean, transaction_id?: string, error?: string }>}
 */
export async function processPokPayment(cartId, cardData, onStepChange, on3dsRequired) {
  try {
    // Step 1: Create SDK Order
    onStepChange?.('creating_order');
    const orderResult = await createPokOrder(cartId);
    if (!orderResult.success) {
      return orderResult;
    }

    // Step 2: Tokenize Card
    onStepChange?.('tokenizing_card');
    const tokenResult = await tokenizeCard(cardData);
    if (!tokenResult.success) {
      return tokenResult;
    }

    // Step 3: Check 3DS
    onStepChange?.('checking_3ds');
    const enrollmentResult = await check3dsEnrollment(
      cartId,
      tokenResult.credit_card_id,
      orderResult.sdk_order_id
    );
    if (!enrollmentResult.success) {
      return enrollmentResult;
    }

    // Step 4: Handle 3DS if required
    let consumerAuthInfo = null;
    if (enrollmentResult.requires_3ds && enrollmentResult.step_up) {
      onStepChange?.('awaiting_3ds');

      // Call the 3DS handler and wait for result
      const authResult = await on3dsRequired?.(enrollmentResult.step_up);
      if (!authResult?.success) {
        return {
          success: false,
          error: authResult?.error || '3DS authentication failed',
        };
      }
      consumerAuthInfo = authResult.authInfo;
    }

    // Step 5: Confirm Payment
    onStepChange?.('confirming_payment');
    const confirmResult = await confirmPokPayment(
      cartId,
      tokenResult.credit_card_id,
      orderResult.sdk_order_id,
      consumerAuthInfo
    );

    if (!confirmResult.success) {
      return confirmResult;
    }

    onStepChange?.('completed');
    return {
      success: true,
      transaction_id: confirmResult.transaction_id,
      sdk_order_id: confirmResult.sdk_order_id,
    };

  } catch (error) {
    console.error('[POK] Payment flow error:', error);
    return {
      success: false,
      error: 'Payment processing failed. Please try again.',
    };
  }
}

/**
 * Format card number with spaces
 * @param {string} value - Card number input
 * @returns {string} Formatted card number
 */
export function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
}

/**
 * Format expiry date as MM/YY
 * @param {string} value - Expiry input
 * @returns {string} Formatted expiry
 */
export function formatExpiry(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.substring(0, 2) + '/' + digits.substring(2, 4);
  }
  return digits;
}

/**
 * Detect card brand from number
 * @param {string} cardNumber - Card number
 * @returns {string} Card brand
 */
export function detectCardBrand(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');

  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';

  return 'unknown';
}
