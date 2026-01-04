'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useTierDiscount } from '@/components/products/TierCartPrice';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import PaymentSelector from '@/components/checkout/PaymentSelector';
import OrderSummary from '@/components/checkout/OrderSummary';
import {
  setShippingAddress,
  setBillingAddress,
  getShippingOptions,
  setShippingMethod,
  initializePaymentSession,
  completeOrder,
  calculateShipping,
} from '@/lib/checkout';
// POK payment is handled by the PokGuestCheckout component directly

const STEPS = {
  INFORMATION: 1,
  PAYMENT: 2,
};

export default function CheckoutPage() {
  const router = useRouter();
  const locale = useLocale();
  const { cart, clearCart, refreshCart, loading: cartLoading } = useCart();
  const { customer, isLoggedIn, zenPoints, refreshCustomer, triggerPointsAnimation, loading: authLoading } = useAuth();
  const { tierColor, currentTier, hasDiscount, discountPercent, applyDiscount } = useTierDiscount();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  
  const [currentStep, setCurrentStep] = useState(STEPS.INFORMATION);
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState(null);
  
  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  
  // Form data - pre-fill from logged in customer
  const [customerInfo, setCustomerInfo] = useState(() => ({
    email: customer?.email || '',
    firstName: customer?.first_name || '',
    lastName: customer?.last_name || '',
    phone: customer?.phone || '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    countryCode: 'al',
  }));
  
  // Billing address state
  const [billingInfo, setBillingInfo] = useState({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    countryCode: 'al',
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  
  // Shipping - auto-selected
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingReady, setShippingReady] = useState(false);
  
  // Custom shipping calculation result (from our Ultra C.E.P API)
  const [customShipping, setCustomShipping] = useState(null);
  
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(null); // Store discount at purchase time

  // POK payment error state (component handles its own loading)
  const [pokPaymentError, setPokPaymentError] = useState(null);

  // Handle phone verification callback - save to customer profile if checkbox checked
  const handlePhoneVerified = async (phone, shouldSaveToAccount = true) => {
    setPhoneVerified(true);
    setVerifiedPhone(phone);
    
    // If logged in and user wants to save phone to account
    if (isLoggedIn && customer && shouldSaveToAccount) {
      try {
        const existingMetadata = customer.metadata || {};
        await fetch('/api/auth/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone, // Save phone to customer profile
            metadata: {
              ...existingMetadata,
              phone_verified: true,
              verified_phone: phone,
            },
          }),
        });
        // Refresh customer to get updated metadata
        await refreshCustomer?.();
      } catch (err) {
        console.error('Failed to save phone verification:', err);
        // Don't block checkout - local state is already updated
      }
    } else if (isLoggedIn && customer) {
      // Even if not saving phone to account, still save verification metadata
      // so they don't need to verify again this session
      try {
        const existingMetadata = customer.metadata || {};
        await fetch('/api/auth/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...existingMetadata,
              phone_verified: true,
              verified_phone: phone,
            },
          }),
        });
        await refreshCustomer?.();
      } catch (err) {
        console.error('Failed to save phone verification metadata:', err);
      }
    }
  };

  // Check if logged-in user already has a verified phone - auto-verify if using same phone
  useEffect(() => {
    if (isLoggedIn && customer) {
      const metadata = customer.metadata || {};
      // If user has a verified phone in their account
      if (metadata.phone_verified && metadata.verified_phone) {
        setVerifiedPhone(metadata.verified_phone);
        // Auto-verify if the checkout phone matches their verified account phone
        if (customerInfo.phone === metadata.verified_phone) {
          setPhoneVerified(true);
        }
      }
    }
  }, [isLoggedIn, customer, customerInfo.phone]);

  // Fetch saved addresses for logged-in users
  useEffect(() => {
    if (isLoggedIn) {
      fetchSavedAddresses();
    }
  }, [isLoggedIn]);

  const fetchSavedAddresses = async () => {
    setAddressesLoading(true);
    try {
      const response = await fetch('/api/addresses');
      const data = await response.json();
      setSavedAddresses(data.addresses || []);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  // Pre-fill form with customer data when logged in
  useEffect(() => {
    if (isLoggedIn && customer) {
      setCustomerInfo(prev => ({
        ...prev,
        email: customer.email || prev.email,
        firstName: customer.first_name || prev.firstName,
        lastName: customer.last_name || prev.lastName,
        phone: customer.phone || prev.phone,
      }));
    }
  }, [isLoggedIn, customer?.email, customer?.phone, customer?.first_name, customer?.last_name]);

  // Redirect if no cart (but wait for cart to finish loading first)
  useEffect(() => {
    if (!cartLoading && !cart?.items?.length && !orderComplete) {
      router.push('/products');
    }
  }, [cart, cartLoading, router, orderComplete]);

  // Save address to account (separate from form submission)
  const handleSaveAddress = async (addressData) => {
    setSavingAddress(true);
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            ...addressData,
            is_default_shipping: savedAddresses.length === 0,
          },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh addresses list
        await fetchSavedAddresses();
        // Return the new address ID
        return data.address?.id || null;
      }
      return null;
    } catch (err) {
      console.error('Failed to save address:', err);
      return null;
    } finally {
      setSavingAddress(false);
    }
  };

  // Edit existing saved address
  const handleEditAddress = async (addressData) => {
    setSavingAddress(true);
    try {
      const response = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressData,
        }),
      });
      
      if (response.ok) {
        // Refresh addresses list to show updated address
        await fetchSavedAddresses();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update address:', err);
      throw err;
    } finally {
      setSavingAddress(false);
    }
  };

  // Auto-calculate shipping when address changes (for saved addresses)
  const handleAddressChange = async (formData, billingData) => {
    // Don't recalculate if already calculating or if address is incomplete (phone required)
    if (calculatingShipping || !formData.email || !formData.phone || !formData.city || !formData.address1) {
      return;
    }
    
    setCalculatingShipping(true);
    setShippingReady(false);
    setError(null);
    setCustomShipping(null);
    
    try {
      setCustomerInfo(formData);
      
      // Calculate shipping via our custom API (Ultra C.E.P rates)
      // Weight is calculated automatically from cart items in the backend
      const shippingResult = await calculateShipping(
        formData.city,
        formData.countryCode,
        cart.id // Backend calculates weight from cart items
      );
      
      if (!shippingResult.available) {
        setError(shippingResult.message || 'Shipping not available to this address.');
        setCalculatingShipping(false);
        return;
      }
      
      // Store custom shipping result
      setCustomShipping(shippingResult);
      
      // Set shipping address
      await setShippingAddress(cart.id, formData);
      
      // Set billing address (same as shipping or different)
      if (billingSameAsShipping) {
        await setBillingAddress(cart.id, formData);
      } else if (billingData) {
        setBillingInfo(billingData);
        await setBillingAddress(cart.id, {
          ...billingData,
          email: formData.email,
          phone: formData.phone,
        });
      }
      
      // Try to get Medusa shipping options (may fail for countries not in region)
      try {
        const options = await getShippingOptions(cart.id);
        setShippingOptions(options);
        
        if (options.length > 0) {
          const firstOption = options[0];
          setSelectedShipping(firstOption.id);
          await setShippingMethod(cart.id, firstOption.id);
        }
      } catch (shippingErr) {
        console.log('[Checkout] Medusa shipping options not available, using custom shipping');
        setShippingOptions([]);
      }
      
      // Mark as ready since we have custom shipping
      setShippingReady(true);
      
      // Refresh cart to get updated totals
      await refreshCart();
      
    } catch (err) {
      setError('Failed to calculate shipping. Please try again.');
      console.error(err);
    } finally {
      setCalculatingShipping(false);
    }
  };

  // Step 1: Calculate shipping (form submission - for guests/new addresses)
  const handleInformationSubmit = async (formData, billingData) => {
    setCalculatingShipping(true);
    setShippingReady(false);
    setError(null);
    setCustomShipping(null);
    
    try {
      setCustomerInfo(formData);
      
      // Calculate shipping via our custom API (Ultra C.E.P rates)
      // Weight is calculated automatically from cart items in the backend
      const shippingResult = await calculateShipping(
        formData.city,
        formData.countryCode,
        cart.id // Backend calculates weight from cart items
      );
      
      console.log('[Checkout] Shipping calculation result:', shippingResult);
      
      if (!shippingResult.available) {
        setError(shippingResult.message || 'Shipping not available to this address.');
        setCalculatingShipping(false);
        return;
      }
      
      // Store custom shipping result
      setCustomShipping(shippingResult);
      
      // Set shipping address
      await setShippingAddress(cart.id, formData);
      
      // Set billing address (same as shipping or different)
      if (billingSameAsShipping) {
        await setBillingAddress(cart.id, formData);
      } else if (billingData) {
        setBillingInfo(billingData);
        await setBillingAddress(cart.id, {
          ...billingData,
          email: formData.email,
          phone: formData.phone,
        });
      }
      
      // Try to get Medusa shipping options (may fail for countries not in region)
      // This is optional since we use our own custom shipping calculation
      try {
        const options = await getShippingOptions(cart.id);
        setShippingOptions(options);
        
        if (options.length > 0) {
          const firstOption = options[0];
          setSelectedShipping(firstOption.id);
          await setShippingMethod(cart.id, firstOption.id);
        }
      } catch (shippingErr) {
        // Medusa shipping options failed (e.g., country not in region)
        // This is OK - we use our custom shipping calculation
        console.log('[Checkout] Medusa shipping options not available, using custom shipping');
        setShippingOptions([]);
      }
      
      // Mark as ready since we have custom shipping
      setShippingReady(true);
      
      // Refresh cart to get updated totals
      await refreshCart();
      
    } catch (err) {
      setError('Failed to calculate shipping. Please try again.');
      console.error(err);
    } finally {
      setCalculatingShipping(false);
    }
  };

  // Handle payment method selection (inline in checkout form)
  const handleSelectPaymentMethod = (method) => {
    setSelectedPayment(method);
  };

  // Continue to payment / Complete COD order
  const handleContinueToPayment = async () => {
    if (!shippingReady || !selectedPayment) return;

    if (selectedPayment === 'cod') {
      // For COD, complete order directly
      await handleCodOrder();
    }
    // POK is now handled inline via PokGuestCheckout component, no step change needed
  };

  // Handle POK payment success (called from PokGuestCheckout)
  const handlePokPaymentSuccess = async (result) => {
    console.log('[Checkout] POK payment success:', result);
    setPokPaymentError(null);

    // Complete the Medusa order
    await handlePokPaymentComplete({
      success: true,
      sdk_order_id: result.sdk_order_id,
    });
  };

  // Handle POK payment error (called from PokGuestCheckout)
  const handlePokPaymentError = (error) => {
    console.error('[Checkout] POK payment error:', error);
    setPokPaymentError(error?.message || 'Payment failed. Please try again.');
  };

  // Handle POK payment completion
  const handlePokPaymentComplete = async (pokResult) => {
    if (!pokResult?.success) {
      setError(pokResult?.error || 'Payment failed');
      return;
    }

    console.log('[Checkout] POK payment completed:', pokResult.transaction_id);
    setLoading(true);
    setError(null);

    try {
      // Apply tier discount before completing order - store result for display
      const discountResult = await applyTierDiscountToCart();

      // Complete the Medusa cart (POK payment already confirmed)
      // We use pp_system_default since POK handles actual payment externally
      try {
        await initializePaymentSession(cart, 'pp_system_default');
      } catch (paymentError) {
        console.log('Payment session init skipped:', paymentError.message);
      }

      const result = await completeOrder(cart.id);

      if (result.success) {
        setCompletedOrder(result.order);
        // Store discount at purchase time (don't recalculate later)
        if (discountResult?.applied) {
          setAppliedDiscount({
            tier: discountResult.tier,
            percent: discountResult.discount_percent,
            amount: discountResult.discount_amount,
          });
        }
        setOrderComplete(true);
        await clearCart();

        // Trigger zen points animation (subscriber handles actual awarding)
        if (isLoggedIn && potentialPoints > 0 && triggerPointsAnimation) {
          triggerPointsAnimation(potentialPoints);
        }
      } else {
        setError(result.error || 'Failed to complete order.');
      }
    } catch (err) {
      setError('Failed to complete order. Your payment was processed - please contact support.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Apply tier discount to cart before completing order
  // ALWAYS call backend when logged in - backend has the source of truth for zen points
  const applyTierDiscountToCart = async () => {
    // Only logged-in users can have tier discounts
    if (!isLoggedIn) {
      console.log('[Checkout] Skipping tier discount: not logged in');
      return { applied: false };
    }

    // Always call backend - don't rely on frontend hasDiscount state
    // Backend will check customer's actual zen_points from database
    try {
      console.log('[Checkout] Checking tier discount with backend:', {
        customerId: customer?.id,
        clerkId: customer?.clerk_id,
        frontendTier: currentTier,
        frontendHasDiscount: hasDiscount
      });
      const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/cart/apply-tier-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          cart_id: cart.id,
          customer_id: customer?.id,
          clerk_id: customer?.clerk_id || customer?.metadata?.clerk_id,
        }),
      });
      const result = await response.json();
      console.log('[Checkout] Tier discount result:', result);
      return result;
    } catch (err) {
      console.error('[Checkout] Failed to apply tier discount:', err);
      // Non-critical - continue with checkout
      return { applied: false, error: err.message };
    }
  };

  // Handle COD order completion
  const handleCodOrder = async () => {
    // Guard: ensure cart exists
    if (!cart?.id) {
      setError('Cart not found. Please refresh the page and try again.');
      console.error('handleCodOrder: cart.id is undefined');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Apply tier discount before completing order - store result to transfer to order
      const discountResult = await applyTierDiscountToCart();

      // Try to initialize COD payment session (may fail for some Medusa configs)
      try {
        // Pass the entire cart object - SDK needs cart.id and cart.payment_collection
        await initializePaymentSession(cart, 'pp_system_default');
      } catch (paymentError) {
        console.log('Payment session init skipped for COD:', paymentError.message);
        // Continue anyway for COD - some Medusa setups don't require payment session
      }

      // Complete the order
      const result = await completeOrder(cart.id);

      if (result.success) {
        setCompletedOrder(result.order);
        // Store discount at purchase time (don't recalculate later)
        if (discountResult?.applied) {
          setAppliedDiscount({
            tier: discountResult.tier,
            percent: discountResult.discount_percent,
            amount: discountResult.discount_amount,
          });
        }
        setOrderComplete(true);
        await clearCart();

        // Transfer order metadata (discount + custom shipping EUR price)
        // Always transfer if we have custom shipping or discount
        if (result.order?.id && (discountResult?.applied || customShipping?.priceEUR)) {
          try {
            const orderMetadata = {};

            // Add tier discount if applied
            if (discountResult?.applied) {
              orderMetadata.zen_tier_discount = {
                tier: discountResult.tier,
                percent: discountResult.discount_percent,
                amount: discountResult.discount_amount,
              };
            }

            // Add custom shipping EUR price (for proper display in orders/invoices)
            if (customShipping?.priceEUR) {
              orderMetadata.custom_shipping = {
                priceEUR: customShipping.priceEUR,
                zoneName: customShipping.zoneName,
                deliveryTime: customShipping.deliveryTime,
              };
            }

            console.log('[Checkout] Transferring metadata to order:', result.order.id, orderMetadata);
            await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/orders/${result.order.id}/metadata`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
              },
              body: JSON.stringify(orderMetadata),
            });
            console.log('[Checkout] Metadata transferred to order');
          } catch (metadataError) {
            console.log('[Checkout] Failed to transfer metadata:', metadataError);
            // Non-critical - the order is already complete
          }
        }

        // Trigger zen points animation (subscriber handles actual awarding)
        if (isLoggedIn && potentialPoints > 0 && triggerPointsAnimation) {
          console.log('[Checkout] Triggering zen points animation for', potentialPoints, 'points');
          triggerPointsAnimation(potentialPoints);
        }
      } else {
        setError(result.error || 'Failed to complete order. Please try again.');
      }
    } catch (err) {
      setError('Failed to process order. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete order
  const handlePaymentSubmit = async () => {
    // Guard: ensure cart exists
    if (!cart?.id) {
      setError('Cart not found. Please refresh the page and try again.');
      console.error('handlePaymentSubmit: cart.id is undefined');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Apply tier discount before completing order - store result to transfer to order
      const discountResult = await applyTierDiscountToCart();

      // Initialize payment session
      const providerId = selectedPayment === 'cod' ? 'pp_system_default' : 'stripe';

      // Pass the entire cart object - SDK needs cart.id and cart.payment_collection
      await initializePaymentSession(cart, providerId);

      // Complete the order
      const result = await completeOrder(cart.id);

      if (result.success) {
        setCompletedOrder(result.order);
        // Store discount at purchase time (don't recalculate later)
        if (discountResult?.applied) {
          setAppliedDiscount({
            tier: discountResult.tier,
            percent: discountResult.discount_percent,
            amount: discountResult.discount_amount,
          });
        }
        setOrderComplete(true);
        await clearCart();

        // Transfer order metadata (discount + custom shipping EUR price)
        // Always transfer if we have custom shipping or discount
        if (result.order?.id && (discountResult?.applied || customShipping?.priceEUR)) {
          try {
            const orderMetadata = {};

            // Add tier discount if applied
            if (discountResult?.applied) {
              orderMetadata.zen_tier_discount = {
                tier: discountResult.tier,
                percent: discountResult.discount_percent,
                amount: discountResult.discount_amount,
              };
            }

            // Add custom shipping EUR price (for proper display in orders/invoices)
            if (customShipping?.priceEUR) {
              orderMetadata.custom_shipping = {
                priceEUR: customShipping.priceEUR,
                zoneName: customShipping.zoneName,
                deliveryTime: customShipping.deliveryTime,
              };
            }

            console.log('[Checkout] Transferring metadata to order:', result.order.id, orderMetadata);
            await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/orders/${result.order.id}/metadata`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
              },
              body: JSON.stringify(orderMetadata),
            });
            console.log('[Checkout] Metadata transferred to order');
          } catch (metadataError) {
            console.log('[Checkout] Failed to transfer metadata:', metadataError);
            // Non-critical - the order is already complete
          }
        }

        // Trigger zen points animation (subscriber handles actual awarding)
        if (isLoggedIn && potentialPoints > 0 && triggerPointsAnimation) {
          console.log('[Checkout] Triggering zen points animation for', potentialPoints, 'points');
          triggerPointsAnimation(potentialPoints);
        }
      } else {
        setError(result.error || 'Failed to complete order. Please try again.');
      }
    } catch (err) {
      setError('Failed to process payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate potential Zen Points to earn
  // Rule: 1 point per €10 spent on products (not shipping)
  // Points are based on ORIGINAL price (not discounted)
  const cartSubtotal = (cart?.items || []).reduce((sum, item) =>
    sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
  const discountedSubtotal = applyDiscount(cartSubtotal);
  const shippingAmount = customShipping?.priceEUR || cart?.shipping_total || 0;
  const actualPaymentTotal = discountedSubtotal + shippingAmount;
  // Points exclude shipping, based on original price: 1 point per €10
  const potentialPoints = cartSubtotal > 0 ? Math.round(cartSubtotal / 10) : 0;

  // Get selected shipping option details
  const selectedShippingOption = shippingOptions.find(o => o.id === selectedShipping);

  // Order confirmation view
  if (orderComplete && completedOrder) {
    // Round to 2 decimal places (avoids floating-point precision issues)
    const round2 = (n) => Math.round(n * 100) / 100;

    // Calculate order total using STORED discount (not recalculated)
    // This ensures historical accuracy even if user's tier changes later
    // Medusa stores prices in whole euros (NOT cents - per CLAUDE.md)
    const orderItemsTotal = (completedOrder.items || []).reduce((sum, item) =>
      sum + ((Number(item.unit_price) || 0) * (Number(item.quantity) || 1)), 0);
    // Use our custom shipping EUR price (calculated with exchange rate) instead of Medusa's
    // shipping_methods amount which may be in ALL or a different currency
    const orderShipping = customShipping?.priceEUR ||
                          Number(completedOrder.shipping_methods?.[0]?.amount) ||
                          Number(completedOrder.shipping_total) || 0;
    // Use stored discount from purchase time (not recalculated)
    const tierDiscountAmount = appliedDiscount?.amount || 0;
    const discountedOrderItems = round2(orderItemsTotal - tierDiscountAmount);
    const finalTotal = round2(discountedOrderItems + orderShipping);
    const orderTotal = finalTotal.toFixed(2);
    const customerFirstName = customer?.first_name || customerInfo.firstName || '';

    // Calculate zen points earned on ORIGINAL items total (excluding shipping)
    // Rule: 1 point per €10 spent on products
    const orderPointsEarned = Math.round(orderItemsTotal / 10);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-baucis-pink-50 via-white to-baucis-green-50/30 py-12 pt-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-baucis-green-100/50">
            
            {/* Baucis Mascot - Animated */}
            <div className="relative w-28 h-28 mx-auto mb-6 animate-[mascotFloat_3s_ease-in-out_infinite]">
              {/* White background circle */}
              <div className="absolute inset-2 bg-gradient-to-br from-baucis-green-50 to-white rounded-full shadow-lg border border-baucis-green-100" />
              
              {/* Celebratory glow */}
              <div className="absolute inset-0 rounded-full bg-baucis-green-400/20 blur-xl animate-pulse" />
              
              {/* Base body */}
              <div className="absolute inset-0 z-10">
                <Image
                  src="/Chat/1.png"
                  alt="Baucis"
                  fill
                  className="object-contain drop-shadow-lg"
                  sizes="112px"
                />
              </div>
              
              {/* Eyes - happy closed */}
              <div className="absolute inset-0 z-10">
                <Image
                  src="/Chat/4.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="112px"
                />
              </div>
              
              {/* Waving arm */}
              <div className="absolute inset-0 z-10 animate-[wave_1s_ease-in-out_infinite]" style={{ transformOrigin: '60% 70%' }}>
                <Image
                  src="/Chat/2.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="112px"
                />
              </div>
            </div>
            
            {/* Thank You Message - Personalized */}
            <h1 
              className="text-3xl text-baucis-green-800 mb-2"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {customerFirstName 
                ? (t('thankYouName', { name: customerFirstName }) || `Thank You, ${customerFirstName}!`)
                : t('thankYou')
              }
            </h1>
            
            <p 
              className="text-baucis-green-600 mb-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('orderConfirmed')}
            </p>
            
            {/* Order ID Badge */}
            <div className="inline-flex items-center gap-2 bg-baucis-green-50 px-4 py-2 rounded-full mb-6">
              <svg className="w-4 h-4 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <span 
                className="text-baucis-green-700 text-sm"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('orderId') || 'Order'}: <span className="font-mono font-medium">#{completedOrder.display_id || completedOrder.id}</span>
              </span>
            </div>

            {/* Zen Points Earned (if logged in) */}
            {isLoggedIn && orderPointsEarned > 0 && (
              <div
                className="rounded-xl p-4 mb-6 border"
                style={{
                  backgroundColor: `${tierColor?.bg || '#f0fdf4'}20`,
                  borderColor: tierColor?.border || '#bbf7d0'
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  {/* Tier Icon */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: tierColor?.bg || '#dcfce7' }}
                  >
                    <svg className="w-6 h-6" style={{ color: tierColor?.text || '#16a34a' }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                  </div>

                  <div className="text-left">
                    <p
                      className="text-sm"
                      style={{ fontFamily: 'Crimson Text, serif', color: tierColor?.text || '#166534' }}
                    >
                      {t('zenPointsEarned') || 'Zen Points earned'}
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{ fontFamily: 'Libre Baskerville, serif', color: tierColor?.text || '#166534' }}
                    >
                      +{orderPointsEarned} <span className="text-sm font-normal">points</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* COD Payment Reminder */}
            {selectedPayment === 'cod' && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-amber-800 font-medium text-sm" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                      {t('codLabel') || 'Cash on Delivery'}
                    </p>
                    <p className="text-amber-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('codExactAmountValue', { amount: orderTotal }) || `Please have €${orderTotal} ready when your order arrives.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Confirmation Note */}
            <p 
              className="text-baucis-green-500 text-sm mb-8 flex items-center justify-center gap-2"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {t('confirmationEmailNote') || "We'll send you an email confirmation with your order details."}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* View Order - Only for logged in users */}
              {isLoggedIn && (
                <Link
                  href={`/${locale}/account/orders`}
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-baucis-green-200 text-baucis-green-700 px-6 py-3 rounded-full hover:bg-baucis-green-50 hover:border-baucis-green-300 transition-all"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                  {t('viewOrder') || 'View My Order'}
                </Link>
              )}
              
              {/* Continue Shopping */}
              <Link
                href={`/${locale}/products`}
                className="inline-flex items-center justify-center gap-2 bg-baucis-green-600 text-white px-6 py-3 rounded-full hover:bg-baucis-green-700 transition-all shadow-md hover:shadow-lg"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {tCart('continueShopping')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            
            {/* Tracking Note for COD */}
            {selectedPayment === 'cod' && (
              <p 
                className="text-gray-400 text-xs mt-6"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('trackingNote') || 'You will receive an SMS with tracking information when your order ships.'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Wait for both cart and auth to load before rendering
  // This ensures zen points are available for discount calculations
  if (cartLoading || authLoading || !cart?.items?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-baucis-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-baucis-pink-50 to-white py-8 pt-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-2xl text-baucis-green-800"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('title')}
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            {currentStep === STEPS.INFORMATION && (
              <CheckoutForm
                initialData={customerInfo}
                onSubmit={handleInformationSubmit}
                onSaveAddress={handleSaveAddress}
                onEditAddress={handleEditAddress}
                onAddressChange={handleAddressChange}
                loading={calculatingShipping}
                savingAddress={savingAddress}
                isLoggedIn={isLoggedIn}
                potentialPoints={potentialPoints}
                savedAddresses={savedAddresses}
                addressesLoading={addressesLoading}
                billingSameAsShipping={billingSameAsShipping}
                onBillingSameChange={setBillingSameAsShipping}
                shippingReady={shippingReady}
                phoneVerified={phoneVerified}
                verifiedPhone={verifiedPhone}
                onPhoneVerified={handlePhoneVerified}
                cartId={cart?.id}
                onProceedToPayment={handleContinueToPayment}
                countryCode={customerInfo.countryCode}
                onSelectPaymentMethod={handleSelectPaymentMethod}
                selectedPaymentMethod={selectedPayment}
                totalAmount={customShipping ? (cart?.subtotal || 0) + customShipping.priceEUR : (cart?.total || 0)}
                currency={cart?.currency_code || 'EUR'}
                onPokPaymentSuccess={handlePokPaymentSuccess}
                onPokPaymentError={handlePokPaymentError}
                customerEmail={customerInfo.email}
                shippingAmount={customShipping?.priceEUR || 0}
                discountAmount={cartSubtotal - discountedSubtotal}
              />
            )}
            
            {currentStep === STEPS.PAYMENT && (
              <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8">
                <PaymentSelector
                  selectedMethod={selectedPayment}
                  onSelect={setSelectedPayment}
                  onSubmit={handlePaymentSubmit}
                  onBack={() => setCurrentStep(STEPS.INFORMATION)}
                  loading={loading}
                  cart={cart}
                  isLoggedIn={isLoggedIn}
                  onPokPaymentComplete={handlePokPaymentComplete}
                />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary 
              cart={cart} 
              potentialPoints={isLoggedIn ? potentialPoints : 0}
              shippingOption={selectedShippingOption}
              customShipping={customShipping}
              shippingReady={shippingReady}
              calculatingShipping={calculatingShipping}
              currentStep={currentStep}
              onContinueToPayment={null}
              loading={loading}
              phoneRequired={false}
              hideProceedButton={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
