'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sdk } from './config';

const CartContext = createContext(null);

// Default region for Albania - update this with your actual region ID
const DEFAULT_REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || null;

// Cart storage configuration
const CART_STORAGE_KEY = 'baucis_cart_id';
const CART_EXPIRY_KEY = 'baucis_cart_expiry';
const GUEST_CART_DURATION_DAYS = 14;
const LOGGED_IN_CART_DURATION_DAYS = 60;

// Cart storage utilities with expiry
const CartStorage = {
  get: () => {
    if (typeof window === 'undefined') return null;
    
    const cartId = localStorage.getItem(CART_STORAGE_KEY);
    const expiry = localStorage.getItem(CART_EXPIRY_KEY);
    
    if (!cartId) return null;
    
    // Check if expired
    if (expiry && new Date().getTime() > parseInt(expiry, 10)) {
      CartStorage.clear();
      return null;
    }
    
    return cartId;
  },
  
  set: (cartId, isLoggedIn = false) => {
    if (typeof window === 'undefined') return;
    
    const days = isLoggedIn ? LOGGED_IN_CART_DURATION_DAYS : GUEST_CART_DURATION_DAYS;
    const expiry = new Date().getTime() + (days * 24 * 60 * 60 * 1000);
    
    localStorage.setItem(CART_STORAGE_KEY, cartId);
    localStorage.setItem(CART_EXPIRY_KEY, expiry.toString());
  },
  
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_EXPIRY_KEY);
  },
  
  extendExpiry: (isLoggedIn = false) => {
    const cartId = localStorage.getItem(CART_STORAGE_KEY);
    if (cartId) {
      CartStorage.set(cartId, isLoggedIn);
    }
  }
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  
  // Refs to handle concurrent operations
  const cartRef = useRef(null);
  const operationInProgressRef = useRef(false);
  const addQueueRef = useRef(Promise.resolve()); // Queue for serializing add operations
  
  // Keep refs in sync with state
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  
  useEffect(() => {
    operationInProgressRef.current = isOperationInProgress;
  }, [isOperationInProgress]);

  // Initialize cart on mount
  useEffect(() => {
    initCart();
  }, []);

  // Listen for customer sync events from auth context
  useEffect(() => {
    const handleCustomerSynced = async (event) => {
      const { customer } = event.detail;
      if (!customer) return;

      // Extend cart expiry for logged-in user (60 days)
      CartStorage.extendExpiry(true);

      // Try to recover customer's existing cart from Medusa
      try {
        const customerCartId = customer.metadata?.active_cart_id;
        const localCartId = CartStorage.get();

        // Case 1: Customer has a saved cart and no local cart
        if (customerCartId && !localCartId) {
          try {
            const { cart: customerCart } = await sdk.store.cart.retrieve(customerCartId, {
              fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
            });
            if (customerCart && customerCart.items?.length > 0) {
              setCart(customerCart);
              CartStorage.set(customerCartId, true);
              console.log('Recovered customer cart:', customerCartId);
              return;
            }
          } catch (e) {
            // Customer cart expired or invalid (404) - clear stale metadata
            console.log('Customer cart expired or invalid, will create new cart');
            clearStaleCartFromCustomer();
            // Continue to Case 3 to create a new cart
          }
        }

        // Case 2: Customer has a saved cart AND local cart (merge needed)
        if (customerCartId && localCartId && customerCartId !== localCartId) {
          try {
            // First verify customer cart exists
            let customerCartExists = false;
            try {
              const { cart: customerCart } = await sdk.store.cart.retrieve(customerCartId, {
                fields: '+items',
              });
              customerCartExists = !!customerCart;
            } catch (e) {
              console.log('Customer cart not found, will use local cart');
              clearStaleCartFromCustomer();
            }

            if (customerCartExists) {
              // Use backend merge endpoint for atomic cart merging
              const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
              const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

              console.log('Merging guest cart into customer cart via backend...');

              const mergeResponse = await fetch(`${MEDUSA_BACKEND_URL}/store/cart/merge`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  guest_cart_id: localCartId,
                  customer_cart_id: customerCartId,
                }),
              });

              if (mergeResponse.ok) {
                const mergeData = await mergeResponse.json();

                if (mergeData.success) {
                  // Retrieve the merged cart with full details
                  const { cart: mergedCart } = await sdk.store.cart.retrieve(customerCartId, {
                    fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
                  });

                  setCart(mergedCart);
                  CartStorage.set(customerCartId, true);
                  console.log(`Cart merge complete: ${mergeData.itemsMerged} items merged`);
                  return;
                }
              }

              // If merge fails, try to use customer cart directly
              const { cart: customerCart } = await sdk.store.cart.retrieve(customerCartId, {
                fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
              });

              if (customerCart?.items?.length > 0) {
                setCart(customerCart);
                CartStorage.set(customerCartId, true);
                return;
              }
            }

            // Customer cart doesn't exist - use local cart instead
            // Fall through to Case 3
          } catch (e) {
            console.log('Cart merge failed, keeping local cart:', e.message);
          }
        }

        // Case 3: Only local cart exists - update with customer email
        if (cart) {
          try {
            const { cart: updatedCart } = await sdk.store.cart.update(cart.id, {
              email: customer.email,
            });
            setCart(updatedCart);

            // Save cart ID to customer metadata for recovery later
            await saveCartToCustomer(customer.id, cart.id);
          } catch (error) {
            console.log('Could not update cart email:', error?.message);
          }
        }
      } catch (error) {
        console.error('Cart sync error:', error);
      }
    };

    const handleCustomerSignedOut = () => {
      // Keep the cart for guest checkout but reset expiry to guest duration
      CartStorage.extendExpiry(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('customer-synced', handleCustomerSynced);
      window.addEventListener('customer-signed-out', handleCustomerSignedOut);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('customer-synced', handleCustomerSynced);
        window.removeEventListener('customer-signed-out', handleCustomerSignedOut);
      }
    };
  }, [cart]);

  // Save cart ID to customer metadata for recovery (pass null to clear)
  const saveCartToCustomer = async (customerId, cartId) => {
    try {
      await fetch('/api/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId }),
      });
    } catch (e) {
      console.log('Could not save cart to customer:', e.message);
    }
  };

  // Clear stale cart ID from customer metadata
  const clearStaleCartFromCustomer = async () => {
    try {
      await fetch('/api/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: null }),
      });
      console.log('Cleared stale cart ID from customer metadata');
    } catch (e) {
      // Non-critical - don't log as error
    }
  };

  const initCart = async () => {
    try {
      const cartId = CartStorage.get();

      if (cartId) {
        try {
          const { cart: existingCart } = await sdk.store.cart.retrieve(cartId, {
            fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
          });

          // Check if cart is already completed (converted to order)
          if (existingCart?.completed_at) {
            console.log('Cart already completed, clearing...');
            CartStorage.clear();
            setCart(null);
            return;
          }

          setCart(existingCart);
        } catch (error) {
          // Cart expired, invalid, completed, or has orphaned customer reference - clear it
          const errorMessage = error?.message || String(error);

          // Check for "already completed" error from Medusa
          if (errorMessage.includes('completed') || errorMessage.includes('not found')) {
            console.log('Cart completed or not found, clearing...');
          } else {
            console.log('Cart expired or invalid, clearing...', errorMessage);
          }

          CartStorage.clear();
          setCart(null);
        }
      }
    } catch (error) {
      console.error('Failed to initialize cart:', error);
      CartStorage.clear();
      setCart(null);
    } finally {
      setLoading(false);
    }
  };

  const createCart = async (customerEmail = null, isLoggedIn = false) => {
    try {
      const cartData = {};
      
      // Add region if configured
      if (DEFAULT_REGION_ID) {
        cartData.region_id = DEFAULT_REGION_ID;
      }

      // Add customer email if provided
      if (customerEmail) {
        cartData.email = customerEmail;
      }
      
      const { cart: newCart } = await sdk.store.cart.create(cartData);
      
      // Store cart ID with appropriate expiry
      CartStorage.set(newCart.id, isLoggedIn);
      
      setCart(newCart);
      cartRef.current = newCart; // Also update ref immediately
      return newCart;
    } catch (error) {
      console.error('Failed to create cart:', error);
      throw error;
    }
  };

  const addItem = useCallback((variantId, quantity = 1) => {
    // Queue add operations to prevent server 500 errors from concurrent modifications
    const operation = addQueueRef.current
      .catch(() => {}) // Ignore previous errors
      .then(async () => {
        // Use ref to get latest cart state
        let currentCart = cartRef.current;
        
        // Create cart if needed
        if (!currentCart) {
          try {
            currentCart = await createCart();
          } catch (createError) {
            console.error('Failed to create cart:', createError);
            return { success: false, error: 'cart_creation_failed', cart: null };
          }
        }
        
        if (!currentCart || !currentCart.id) {
          console.error('No cart available');
          return { success: false, error: 'no_cart', cart: null };
        }
        
        // Add item to cart
        try {
          const response = await sdk.store.cart.createLineItem(currentCart.id, {
            variant_id: variantId,
            quantity,
          });
          
          const updatedCart = response?.cart;
          if (updatedCart) {
            setCart(updatedCart);
            cartRef.current = updatedCart;
            setIsDrawerOpen(true);
            return { success: true, cart: updatedCart };
          }
        } catch (sdkError) {
          const errorMessage = sdkError?.message || String(sdkError);
          
          // Check for inventory error - this is expected, don't log as error
          if (errorMessage.includes('inventory') || errorMessage.includes('Variant')) {
            // Try to get current inventory from the cart item if it exists
            const existingItem = currentCart.items?.find(item => item.variant_id === variantId);
            const currentQuantityInCart = existingItem?.quantity || 0;
            
            return { 
              success: false, 
              error: 'insufficient_inventory',
              currentQuantityInCart,
              requestedQuantity: quantity,
              cart: currentCart
            };
          }
          
          // Only log unexpected errors
          console.error('SDK createLineItem failed:', errorMessage);
          return { success: false, error: errorMessage, cart: currentCart };
        }
        
        // Fallback: fetch fresh cart state
        try {
          const { cart: freshCart } = await sdk.store.cart.retrieve(currentCart.id, {
            fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
          });
          if (freshCart) {
            setCart(freshCart);
            cartRef.current = freshCart;
            setIsDrawerOpen(true);
            return { success: true, cart: freshCart };
          }
        } catch (fetchError) {
          console.error('Failed to fetch cart:', fetchError?.message || fetchError);
        }
        
        return { success: false, error: 'unknown', cart: currentCart };
      });
    
    addQueueRef.current = operation;
    return operation;
  }, []);

  const removeItem = useCallback(async (lineItemId) => {
    const currentCart = cartRef.current;
    if (!currentCart) return currentCart;
    
    try {
      await sdk.store.cart.deleteLineItem(currentCart.id, lineItemId);
    } catch (deleteError) {
      console.error('SDK deleteLineItem error:', deleteError);
    }
    
    // Always re-fetch the cart
    try {
      const { cart: refreshedCart } = await sdk.store.cart.retrieve(currentCart.id, {
        fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
      });
      
      if (refreshedCart) {
        setCart(refreshedCart);
        cartRef.current = refreshedCart;
        setIsDrawerOpen(true);
        return refreshedCart;
      }
    } catch (fetchError) {
      console.error('Failed to fetch cart:', fetchError);
    }
    
    return currentCart;
  }, []);

  const updateItem = useCallback(async (lineItemId, quantity) => {
    const currentCart = cartRef.current;
    if (!currentCart) return { success: false, error: 'No cart available', cart: currentCart };
    
    let updateError = null;
    
    try {
      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(currentCart.id, lineItemId);
      } else {
        await sdk.store.cart.updateLineItem(currentCart.id, lineItemId, { quantity });
      }
    } catch (sdkError) {
      // Check for inventory error - handle all possible Medusa error messages
      const errorMessage = sdkError?.message || String(sdkError);
      const isInventoryError = 
        errorMessage.includes('inventory') || 
        errorMessage.includes('Variant') ||
        errorMessage.includes('stock') ||
        errorMessage.includes('quantity') ||
        sdkError?.status === 400;
      
      if (isInventoryError) {
        // This is expected when user exceeds stock - don't log as error
        updateError = 'insufficient_inventory';
      } else {
        // Only log unexpected errors
        console.error('SDK update/delete error:', sdkError);
        updateError = errorMessage;
      }
    }
    
    // Always re-fetch the cart to get accurate state
    try {
      const { cart: refreshedCart } = await sdk.store.cart.retrieve(currentCart.id, {
        fields: '+items,+items.variant,+items.variant.product,+items.variant.inventory_quantity,+items.thumbnail',
      });
      
      if (refreshedCart) {
        setCart(refreshedCart);
        cartRef.current = refreshedCart;
        return { 
          success: !updateError, 
          error: updateError, 
          cart: refreshedCart 
        };
      }
    } catch (fetchError) {
      console.error('Failed to fetch cart:', fetchError);
    }
    
    return { success: !updateError, error: updateError, cart: currentCart };
  }, []);

  const clearCart = useCallback(async () => {
    CartStorage.clear();
    setCart(null);
  }, []);

  // Update cart with customer info (used during checkout)
  const updateCartCustomer = useCallback(async (customerData) => {
    if (!cart) return;

    try {
      const updateData = {};
      
      if (customerData.email) {
        updateData.email = customerData.email;
      }

      if (Object.keys(updateData).length > 0) {
        const { cart: updatedCart } = await sdk.store.cart.update(cart.id, updateData);
        setCart(updatedCart);
        return updatedCart;
      }
      
      return cart;
    } catch (error) {
      console.error('Failed to update cart customer:', error);
      throw error;
    }
  }, [cart]);

  const getTotalItems = useCallback(() => {
    return cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }, [cart]);

  const getSubtotal = useCallback(() => {
    return cart?.subtotal || 0;
  }, [cart]);

  const getTotal = useCallback(() => {
    return cart?.total || 0;
  }, [cart]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen(prev => !prev), []);

  const value = {
    cart,
    loading,
    isDrawerOpen,
    isOperationInProgress,
    addItem,
    updateItem,
    updateItemQuantity: updateItem, // alias for CartItem component
    removeItem,
    clearCart,
    updateCartCustomer,
    getTotalItems,
    getSubtotal,
    getTotal,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    refreshCart: initCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
