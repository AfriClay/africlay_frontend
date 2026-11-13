import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, Clock3, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { ApiError, getApiErrorMessage } from '../../services/api';
import { orderKeys, orderService } from '../../services/orderService';
import { isOrderPaymentPhone, paymentKeys, paymentService } from '../../services/paymentService';
import { theme } from '../../theme';
import { Payment } from '../../types/payment';
import { Order, OrderPaymentOption } from '../../types/order';
import { formatCurrency } from '../../utils/formatCurrency';
import { catalogKeys } from '../../services/catalogQueries';
import { productService } from '../../services/productService';
import { HomeLocation, shippingService } from '../../services/shippingService';
import { getDeviceCoordinates } from '../../services/deviceLocation';

type CheckoutNavigation = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
type CheckoutRoute = RouteProp<RootStackParamList, 'Checkout'>;
type CheckoutStage = 'idle' | 'creating-order' | 'requesting-payment' | 'payment-pending' | 'payment-succeeded' | 'payment-failed' | 'payment-unknown';

const PAYMENT_POLL_LIMIT = 12;
const PAYMENT_POLL_INTERVAL = 5_000;

export const Checkout: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigation>();
  const route = useRoute<CheckoutRoute>();
  const compactPaymentOptions = useWindowDimensions().width < 360;
  const cart = useCart();
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const buyNowProductId = route.params?.buyNowProductId;
  const buyNowProductSlug = route.params?.buyNowProductSlug;
  const isBuyNow = Boolean(buyNowProductId || buyNowProductSlug);
  const buyNowQuantity = route.params?.buyNowQuantity ?? 1;
  const buyNowOptionId = route.params?.buyNowOptionId;
  const buyNowQuery = useQuery({
    queryKey: catalogKeys.product(buyNowProductSlug ?? ''),
    queryFn: () => productService.fetchProductById(buyNowProductSlug!),
    enabled: Boolean(buyNowProductId && buyNowProductSlug),
  });
  const buyNowProduct = buyNowQuery.data?.id === buyNowProductId ? buyNowQuery.data : undefined;
  const buyNowOption = buyNowProduct?.priceOptions?.find(option => option.id === buyNowOptionId);
  const checkoutItems = isBuyNow
    ? buyNowProduct ? [{
      id: `buy-now:${buyNowProduct.id}`,
      productId: buyNowProduct.id,
      productSlug: buyNowProduct.slug,
      name: buyNowProduct.name,
      price: buyNowOption?.price ?? buyNowProduct.price,
      priceUnit: buyNowProduct.priceUnit,
      optionId: buyNowOption?.id, optionLabel: buyNowOption?.label,
      quantity: buyNowQuantity,
    }] : []
    : cart.items;
  const checkoutItemCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutLoading = isBuyNow ? buyNowQuery.isLoading : cart.loading;
  const checkoutError = isBuyNow
    ? !buyNowProductId || !buyNowProductSlug
      ? 'This checkout link is incomplete. Return to the product and tap Buy now again.'
      : buyNowQuery.isError
      ? getApiErrorMessage(buyNowQuery.error, 'Unable to load this product for checkout.')
      : !buyNowQuery.isLoading && !buyNowQuery.data ? 'This product is no longer available.'
      : buyNowProduct?.priceOptions?.length && !buyNowOption ? 'This price option is no longer available. Return to the product and choose again.'
      : buyNowQuery.data && !buyNowProduct ? 'This checkout selection has changed. Return to the product and tap Buy now again.' : undefined
    : cart.items.some(item => item.optionUnavailable) ? 'A price option in your cart is no longer available. Remove it before checkout.'
    : cart.items.some(item => item.availableStock !== undefined && item.quantity > item.availableStock) ? 'An item in your cart exceeds available stock. Update its quantity before checkout.' : cart.error;
  const checkoutScope = isBuyNow ? {
    buy_now_product_id: buyNowProductId,
    buy_now_quantity: buyNowQuantity,
    ...(buyNowOptionId ? { buy_now_option_id: buyNowOptionId } : {}),
  } : {};
  const queryClient = useQueryClient();
  const pickupPointsQuery = useQuery({
    queryKey: ['pickup-points', userId], queryFn: shippingService.pickupPoints, enabled: Boolean(userId),
  });
  const [selectedPickupId, setSelectedPickupId] = useState<string>();
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup_point' | 'doorstep'>('pickup_point');
  const [homeSearch, setHomeSearch] = useState('');
  const [debouncedHomeSearch, setDebouncedHomeSearch] = useState('');
  const [selectedHome, setSelectedHome] = useState<HomeLocation>();
  const [gpsSuggestion, setGpsSuggestion] = useState<HomeLocation>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const locationRequestId = useRef(0);
  const [homeInstructions, setHomeInstructions] = useState('');
  const [stage, setStage] = useState<CheckoutStage>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [paymentOption, setPaymentOption] = useState<OrderPaymentOption>('pay_now');
  const [error, setError] = useState<string>();
  const [statusError, setStatusError] = useState<string>();
  const [orderCreationUncertain, setOrderCreationUncertain] = useState(false);
  const [authSheet, setAuthSheet] = useState(!auth.user);
  const [orderId, setOrderId] = useState<string>();
  const [createdOrder, setCreatedOrder] = useState<Order>();
  const [payment, setPayment] = useState<Payment>();
  const inFlight = useRef(false);
  const statusRequest = useRef<AbortController | undefined>(undefined);
  const pickupPoints = pickupPointsQuery.data ?? [];
  const selectedPickup = pickupPoints.find(point => point.id === selectedPickupId) ?? pickupPoints[0];
  const deliveryPayload = selectedPickup && (deliveryMethod === 'pickup_point' || selectedHome)
    ? {
      delivery_method: deliveryMethod,
      pickup_point_id: selectedPickup.id,
      ...(deliveryMethod === 'doorstep' ? { home_location_token: selectedHome!.token, home_delivery_instructions: homeInstructions.trim() } : {}),
    } : undefined;
  const homeLocationsQuery = useQuery({
    queryKey: ['doorstep-locations', userId, selectedPickup?.id, debouncedHomeSearch],
    queryFn: () => shippingService.homeLocations(selectedPickup!.id, debouncedHomeSearch),
    enabled: deliveryMethod === 'doorstep' && Boolean(userId && selectedPickup?.doorstep_available && debouncedHomeSearch.length >= 5),
    staleTime: 60_000,
  });
  const cartSignature = checkoutItems.map(item => `${item.id}:${item.optionId ?? ''}:${item.quantity}`).join('|');
  const quoteQuery = useQuery({
    queryKey: orderKeys.shippingQuote(userId, `${deliveryMethod}:${selectedPickup?.id ?? ''}:${selectedHome?.token ?? ''}`, cartSignature),
    queryFn: () => orderService.shippingQuote({ ...deliveryPayload!, ...checkoutScope }),
    enabled: Boolean(userId && cart.available && checkoutItemCount && deliveryPayload && !checkoutError),
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHomeSearch(homeSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [homeSearch]);

  useEffect(() => {
    locationRequestId.current += 1;
    setSelectedHome(undefined);
    setGpsSuggestion(undefined);
    setLocationError(undefined);
    setHomeSearch('');
  }, [selectedPickup?.id]);

  const useCurrentLocation = async () => {
    if (!selectedPickup?.doorstep_available || locating) return;
    const requestId = ++locationRequestId.current;
    setLocationError(undefined);
    setGpsSuggestion(undefined);
    setSelectedHome(undefined);
    setLocating(true);
    try {
      const coordinates = await getDeviceCoordinates();
      const suggestion = await shippingService.currentLocation(selectedPickup.id, coordinates);
      if (locationRequestId.current !== requestId) return;
      setHomeSearch('');
      setDebouncedHomeSearch('');
      setGpsSuggestion(suggestion);
    } catch (cause) {
      if (locationRequestId.current === requestId) {
        setLocationError(cause instanceof ApiError
          ? getApiErrorMessage(cause, 'Could not confirm this location. Search for a building instead.')
          : cause instanceof Error ? cause.message : 'Could not get your location. Search for a building instead.');
      }
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!auth.user) setAuthSheet(true);
  }, [auth.user]);

  useEffect(() => {
    if (phoneTouched || phoneNumber) return;
    const suggested = auth.user?.phoneNumber;
    if (suggested) setPhoneNumber(suggested);
  }, [auth.user?.phoneNumber, phoneNumber, phoneTouched]);

  const syncOrderState = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.buyer(userId) });
    void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }, [queryClient, userId]);

  const applyPayment = useCallback((next: Payment) => {
    setPayment(next);
    queryClient.setQueryData(paymentKeys.detail(next.id), next);
    if (next.status === 'succeeded') {
      setStage('payment-succeeded');
      setStatusError(undefined);
      syncOrderState();
    } else if (next.status === 'failed' || next.status === 'cancelled') {
      setStage('payment-failed');
    } else {
      setStage('payment-pending');
    }
  }, [queryClient, syncOrderState]);

  const checkPaymentStatus = useCallback(async () => {
    if (!payment?.id || statusRequest.current) return;
    const controller = new AbortController();
    statusRequest.current = controller;
    setStatusError(undefined);
    try {
      applyPayment(await paymentService.getPayment(payment.id, controller.signal));
    } catch (statusCheckError) {
      if (!(statusCheckError instanceof Error && statusCheckError.name === 'AbortError')) {
        setStatusError(getApiErrorMessage(statusCheckError, 'Unable to refresh payment status.'));
      }
    } finally {
      if (statusRequest.current === controller) statusRequest.current = undefined;
    }
  }, [applyPayment, payment?.id]);

  useEffect(() => {
    if (stage !== 'payment-pending' || !payment?.id) return;
    let stopped = false;
    let checks = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (stopped || checks >= PAYMENT_POLL_LIMIT) return;
      checks += 1;
      await checkPaymentStatus();
      if (!stopped && checks < PAYMENT_POLL_LIMIT) timer = setTimeout(poll, PAYMENT_POLL_INTERVAL);
      else if (!stopped) setStatusError(current => current ?? 'Automatic checks paused. Use Check Payment Status to refresh again.');
    };
    timer = setTimeout(poll, PAYMENT_POLL_INTERVAL);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      statusRequest.current?.abort();
      statusRequest.current = undefined;
    };
  }, [checkPaymentStatus, payment?.id, stage]);

  useEffect(() => {
    if (stage !== 'payment-pending' || !payment?.id) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkPaymentStatus();
    });
    return () => subscription.remove();
  }, [checkPaymentStatus, payment?.id, stage]);

  const requestPayment = useCallback(async (targetOrderId: string) => {
    if (inFlight.current) return;
    if (!isOrderPaymentPhone(phoneNumber)) {
      setError('Enter a Kenyan M-Pesa number in 2547XXXXXXXX or 2541XXXXXXXX format.');
      return;
    }
    inFlight.current = true;
    setStage('requesting-payment');
    setError(undefined);
    setStatusError(undefined);
    try {
      applyPayment(await paymentService.initiateOrderPayment(targetOrderId, phoneNumber));
    } catch (paymentError) {
      setStage('payment-unknown');
      setError(paymentError instanceof ApiError && paymentError.status < 500
        ? getApiErrorMessage(paymentError, 'Payment could not be started.')
        : 'Your order exists, but payment status could not be confirmed. Do not create another order. You can safely recover this order payment below.');
    } finally {
      inFlight.current = false;
    }
  }, [applyPayment, phoneNumber]);

  const submit = async () => {
    if (inFlight.current || checkoutError || !checkoutItemCount || !deliveryPayload || !auth.user || !cart.available || quoteQuery.isFetching) return;
    if (!isOrderPaymentPhone(phoneNumber)) {
      setPhoneTouched(true);
      setError('Enter a Kenyan M-Pesa number in 2547XXXXXXXX or 2541XXXXXXXX format.');
      return;
    }
    if (!quoteQuery.data) { setError('Wait for the delivery quote before placing the order.'); return; }
    const reviewedQuote = quoteQuery.data;
    if (!reviewedQuote.pickupPointAddress) {
      setError('Pickup point quote is incomplete. Refresh the quote before placing the order.');
      return;
    }
    if (deliveryMethod === 'doorstep' && !reviewedQuote.doorstepQuoteToken) {
      setError('Doorstep quote is incomplete. Refresh the quote before paying.');
      return;
    }
    inFlight.current = true;
    setStage('creating-order');
    setError(undefined);
    setOrderCreationUncertain(false);
    try {
      const order = await orderService.checkout({
        ...deliveryPayload,
        payment_method: 'mpesa',
        payment_option: paymentOption,
        expected_item_subtotal: reviewedQuote.itemSubtotal.toFixed(2),
        expected_shipping_cost: reviewedQuote.shippingCost.toFixed(2),
        expected_total_amount: reviewedQuote.total.toFixed(2),
        expected_pickup_point_address: reviewedQuote.pickupPointAddress,
        ...(deliveryMethod === 'doorstep' ? { expected_doorstep_quote_token: reviewedQuote.doorstepQuoteToken } : {}),
        ...checkoutScope,
      });
      setOrderId(order.id);
      setCreatedOrder(order);
      inFlight.current = false;
      await Promise.allSettled([
        cart.refresh(),
        queryClient.invalidateQueries({ queryKey: orderKeys.buyer(userId) }),
        queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      ]);
      await requestPayment(order.id);
    } catch (submitError) {
      setStage('idle');
      const uncertain = !(submitError instanceof ApiError) || submitError.status >= 500;
      setOrderCreationUncertain(uncertain);
      const responseMessage = getApiErrorMessage(submitError, 'Unable to place your order.');
      if (submitError instanceof ApiError && /location.*expired/i.test(responseMessage)) {
        setSelectedHome(undefined);
        setError('Your selected location expired. Search for your address and choose it again.');
        return;
      }
      if (submitError instanceof ApiError && /(price|pickup point|quote).*(changed|expired)/i.test(responseMessage)) {
        const refreshed = await quoteQuery.refetch();
        setError(refreshed.isSuccess
          ? 'Delivery was repriced. Review the updated total before placing the order again.'
          : 'The delivery quote could not be refreshed. Try a new location or retry the quote.');
        return;
      }
      setError(submitError instanceof ApiError && submitError.status < 500
        ? responseMessage
        : 'Order status could not be confirmed. Check My Orders before trying checkout again.');
    } finally {
      inFlight.current = false;
    }
  };

  if (!auth.user) return <SafeAreaView style={styles.container}>
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description={isBuyNow ? 'Log in or create an account to buy this item. Your normal cart will remain unchanged.' : 'Your cart is saved. Log in or create an account to choose delivery and place the order.'} />
    <ScrollView testID="checkout-scroll" style={styles.scroll} contentContainerStyle={styles.gateContent} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Checkout</Text><Text style={styles.note}>An account is required for delivery details, order history, and payment confirmation. No order or payment will be started automatically after sign-in.</Text><Button onPress={() => setAuthSheet(true)}>Continue to Login</Button></ScrollView>
  </SafeAreaView>;

  if (!cart.available) return <SafeAreaView style={styles.confirmation}>
    <ScrollView testID="checkout-scroll" style={styles.scroll} contentContainerStyle={styles.confirmationContent}>
      <AlertTriangle color={theme.colors.error} size={64} />
      <Text style={styles.title}>Buyer account required</Text>
      <Text style={styles.confirmationText}>Checkout is available to buyer-enabled accounts.</Text>
      <Button variant="secondary" onPress={() => navigation.goBack()}>Go Back</Button>
    </ScrollView>
  </SafeAreaView>;

  if (orderId && stage !== 'idle') {
    const succeeded = stage === 'payment-succeeded';
    const pending = stage === 'creating-order' || stage === 'payment-pending' || stage === 'requesting-payment';
    const Icon = succeeded ? CircleCheckBig : pending ? Clock3 : AlertTriangle;
    const title = succeeded ? 'Payment confirmed' : pending ? 'Payment pending' : stage === 'payment-failed' ? 'Payment failed' : 'Payment status unknown';
    const description = succeeded
      ? payment?.purpose === 'delivery_fee'
        ? `Order #${orderId.slice(0, 8)} is confirmed. The delivery fee is paid and the item balance is due at delivery.`
        : `Order #${orderId.slice(0, 8)} is paid and ready for the seller to process.`
      : stage === 'creating-order' ? 'Your order was created. Preparing payment...'
      : pending
        ? 'Complete the M-Pesa prompt on your phone. This screen checks for confirmation for a limited time.'
        : stage === 'payment-failed'
          ? 'The payment was not completed. Your order remains unpaid.'
          : 'The order was created, but the payment result could not be confirmed.';
    return <SafeAreaView style={styles.confirmation}>
      <ScrollView testID="checkout-scroll" style={styles.scroll} contentContainerStyle={styles.confirmationContent}>
        {stage === 'requesting-payment' ? <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} /> : <Icon color={succeeded ? theme.colors.success : pending ? theme.colors.secondary.dark : theme.colors.error} size={68} />}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.confirmationText}>{description}</Text>
        {createdOrder ? <View style={styles.confirmationBreakdown}>
          <View style={styles.totalRow}><Text style={styles.note}>Items</Text><Text style={styles.summaryAmount}>{formatCurrency(createdOrder.itemSubtotal, createdOrder.currency)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.note}>Delivery</Text><Text style={styles.summaryAmount}>{formatCurrency(createdOrder.shippingCost, createdOrder.currency)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.note}>Order total</Text><Text style={styles.summaryAmount}>{formatCurrency(createdOrder.total, createdOrder.currency)}</Text></View>
        </View> : null}
        <Text style={styles.note}>{payment?.purpose === 'delivery_fee' || (!payment && paymentOption === 'pay_on_delivery') ? 'Delivery payment' : 'Payment amount'}</Text>
        <Text style={styles.orderMeta}>{formatCurrency(payment?.amount ?? (paymentOption === 'pay_on_delivery' ? createdOrder?.shippingCost : createdOrder?.total) ?? 0, payment?.currency ?? createdOrder?.currency ?? 'KES')}</Text>
        {payment?.receiptNumber ? <Text style={styles.note}>Receipt {payment.receiptNumber}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {statusError ? <Text style={styles.error} accessibilityRole="alert">{statusError}</Text> : null}
        <View style={styles.actions}>
          {payment?.id && pending ? <Button variant="secondary" onPress={() => void checkPaymentStatus()}>Check Payment Status</Button> : null}
          {!payment?.id && stage === 'payment-unknown' ? <Button onPress={() => void requestPayment(orderId)}>Recover Payment</Button> : null}
          {stage === 'payment-failed' ? <Button onPress={() => void requestPayment(orderId)}>Try Payment Again</Button> : null}
          <Button variant={succeeded ? 'primary' : 'secondary'} onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button>
          {succeeded ? <Button variant="tertiary" onPress={() => navigation.navigate('AppTabs', { screen: 'Home' })}>Continue Shopping</Button> : null}
        </View>
      </ScrollView>
    </SafeAreaView>;
  }

  const header = <>
    <View style={styles.header}><Text style={styles.title}>Checkout</Text><Button variant="icon" icon={<X color={theme.colors.ink} size={22} />} onPress={() => navigation.goBack()} accessibilityLabel="Close checkout" /></View>
    <Text style={styles.sectionTitle}>Delivery</Text>
    <Pressable onPress={() => { locationRequestId.current += 1; setDeliveryMethod('pickup_point'); }} accessibilityRole="radio" accessibilityState={{ selected: deliveryMethod === 'pickup_point' }} style={[styles.address, deliveryMethod === 'pickup_point' && styles.selectedAddress]}>
      <Text style={styles.addressName}>Collect from an AfriClay pickup point</Text>
      <Text style={styles.note}>The logistics company collects from each seller and delivers to your chosen point.</Text>
    </Pressable>
    <Pressable onPress={() => { if (selectedPickup?.doorstep_available) setDeliveryMethod('doorstep'); }} accessibilityRole="radio" accessibilityState={{ selected: deliveryMethod === 'doorstep', disabled: !selectedPickup?.doorstep_available }} style={[styles.address, deliveryMethod === 'doorstep' && styles.selectedAddress]}>
      <Text style={styles.addressName}>Deliver to my doorstep</Text>
      <Text style={styles.note}>{selectedPickup?.doorstep_available ? 'A rider brings the parcel from your chosen pickup point to your confirmed location. The extra road-distance fee appears before payment.' : 'Doorstep delivery is being prepared. Pickup-point collection is available now.'}</Text>
    </Pressable>
      <Text style={styles.sectionTitle}>Choose a pickup point</Text>
      {pickupPointsQuery.isLoading ? <Text style={styles.note}>Loading pickup points...</Text> : null}
      {pickupPointsQuery.isError ? <View><Text style={styles.error}>Pickup points could not be loaded.</Text><Button variant="secondary" onPress={() => void pickupPointsQuery.refetch()}>Retry</Button></View> : null}
      {pickupPointsQuery.isSuccess && pickupPoints.length === 0 ? <Text style={styles.note}>No pickup points are available right now.</Text> : null}
      {pickupPoints.map(point => <Pressable key={point.id} accessibilityRole="radio" accessibilityState={{ selected: selectedPickup?.id === point.id }} onPress={() => setSelectedPickupId(point.id)} style={[styles.address, selectedPickup?.id === point.id && styles.selectedAddress]}>
        <Text style={styles.addressName}>{point.name}</Text>
        <Text style={styles.note}>{[point.address, point.city, point.postal_code, 'Kenya'].filter(Boolean).join(', ')}</Text>
      </Pressable>)}
    {deliveryMethod === 'doorstep' ? <View>
      <Text style={styles.sectionTitle}>Confirm your delivery location</Text>
      <Button variant="secondary" onPress={() => void useCurrentLocation()} loading={locating} loadingLabel="Finding your location" accessibilityLabel="Use my current location for doorstep delivery">Use my current location</Button>
      <Text style={styles.note}>We’ll ask for location access, then show the nearby address for you to confirm before calculating the delivery fee.</Text>
      {locationError ? <Text style={styles.error} accessibilityRole="alert">{locationError}</Text> : null}
      {gpsSuggestion ? <Pressable accessibilityRole="radio" accessibilityState={{ selected: selectedHome?.token === gpsSuggestion.token }} onPress={() => { locationRequestId.current += 1; setSelectedHome(gpsSuggestion); }} style={[styles.address, selectedHome?.token === gpsSuggestion.token && styles.selectedAddress]}>
        <Text style={styles.addressName}>Confirm this delivery pin</Text>
        <Text style={styles.note}>{gpsSuggestion.label}</Text>
      </Pressable> : null}
      <Input label="Or search a building or landmark" value={homeSearch} onChangeText={value => { locationRequestId.current += 1; setHomeSearch(value); setSelectedHome(undefined); setGpsSuggestion(undefined); setLocationError(undefined); }} placeholder="Search a building or landmark in the pickup city" autoComplete="street-address" />
      {homeLocationsQuery.isFetching ? <Text style={styles.note}>Searching locations...</Text> : null}
      {homeLocationsQuery.isError ? <View><Text style={styles.error}>Address search failed. Please try again.</Text><Button variant="secondary" onPress={() => void homeLocationsQuery.refetch()}>Retry address search</Button></View> : null}
      {homeLocationsQuery.data?.map(location => <Pressable key={location.token} accessibilityRole="radio" accessibilityState={{ selected: selectedHome?.token === location.token }} onPress={() => { locationRequestId.current += 1; setSelectedHome(location); setHomeSearch(location.label); }} style={[styles.address, selectedHome?.token === location.token && styles.selectedAddress]}>
        <Text style={styles.addressName}>{location.label}</Text>
      </Pressable>)}
      {debouncedHomeSearch.length >= 5 && homeLocationsQuery.isSuccess && !homeLocationsQuery.data?.length && !selectedHome ? <Text style={styles.note}>No precise location found in {selectedPickup?.city}. Try a nearby named building or choose pickup-point collection.</Text> : null}
      {selectedHome ? <Text style={styles.note}>Confirmed destination: {selectedHome.label}</Text> : null}
      <Input label="Floor, unit or delivery instructions" value={homeInstructions} onChangeText={setHomeInstructions} placeholder="Optional details for the rider" maxLength={255} />
      <View style={styles.attribution}>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.geoapify.com/')}><Text style={styles.attributionLink}>Powered by Geoapify</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}><Text style={styles.attributionLink}>© OpenStreetMap contributors</Text></Pressable>
      </View>
    </View> : null}
    <Text style={styles.sectionTitle}>Payment option</Text>
    <View style={[styles.paymentOptions, compactPaymentOptions && styles.paymentOptionsCompact]}>
      <Pressable onPress={() => setPaymentOption('pay_now')} accessibilityRole="radio" accessibilityState={{ selected: paymentOption === 'pay_now' }} style={[styles.paymentOption, compactPaymentOptions && styles.paymentOptionCompact, paymentOption === 'pay_now' && styles.paymentOptionSelected]}>
        <Text style={[styles.paymentOptionTitle, paymentOption === 'pay_now' && styles.paymentOptionTitleSelected]}>Pay Now</Text>
        <Text style={styles.paymentOptionNote}>Items and delivery</Text>
      </Pressable>
      <Pressable onPress={() => setPaymentOption('pay_on_delivery')} accessibilityRole="radio" accessibilityState={{ selected: paymentOption === 'pay_on_delivery' }} style={[styles.paymentOption, compactPaymentOptions && styles.paymentOptionCompact, paymentOption === 'pay_on_delivery' && styles.paymentOptionSelected]}>
        <Text style={[styles.paymentOptionTitle, paymentOption === 'pay_on_delivery' && styles.paymentOptionTitleSelected]}>Pay on Delivery</Text>
        <Text style={styles.paymentOptionNote}>Delivery fee now</Text>
      </Pressable>
    </View>
    <Text style={styles.sectionTitle}>M-Pesa Payment</Text>
    <Input
      label="Phone number"
      required
      value={phoneNumber}
      onChangeText={value => { setPhoneTouched(true); setPhoneNumber(value); setError(undefined); }}
      placeholder="254712345678"
      keyboardType="phone-pad"
      autoComplete="tel"
      error={phoneTouched && phoneNumber && !isOrderPaymentPhone(phoneNumber) ? 'Use 2547XXXXXXXX or 2541XXXXXXXX format.' : undefined}
    />
    <Text style={styles.note}>An M-Pesa prompt will be sent after your order is created.</Text>
    <Text style={styles.sectionTitle}>Order Summary</Text>
  </>;
  const busy = stage === 'creating-order' || stage === 'requesting-payment';
  const quote = quoteQuery.data;
  const pickupQuoteIncomplete = Boolean(quote) && (!quote?.pickupPointAddress || (deliveryMethod === 'doorstep' && !quote.doorstepQuoteToken));
  const quoteErrorMessage = quoteQuery.isError ? getApiErrorMessage(quoteQuery.error, 'Delivery could not be calculated for this pickup point.') : undefined;
  const sellerDispatchError = quoteErrorMessage?.toLowerCase().includes('dispatch town');
  const dueNow = paymentOption === 'pay_on_delivery' ? quote?.shippingCost ?? 0 : quote?.total ?? 0;
  const footer = <View style={styles.footer}>
    {quoteQuery.isLoading ? <View style={styles.quoteState}><ActivityIndicator color={theme.colors.primary.DEFAULT} /><Text style={styles.note}>Calculating delivery...</Text></View> : null}
    {quoteQuery.isError ? <View style={styles.quoteError}>
      <Text style={styles.error}>{quoteErrorMessage}</Text>
      {sellerDispatchError ? <Text style={styles.quoteHint}>The seller needs to update their parcel pickup town.</Text> : null}
      <Button size="sm" variant="secondary" onPress={() => void quoteQuery.refetch()}>Retry Quote</Button>
    </View> : null}
    {pickupQuoteIncomplete ? <View style={styles.quoteError}><Text style={styles.error}>Pickup point quote is incomplete.</Text><Button size="sm" variant="secondary" onPress={() => void quoteQuery.refetch()}>Retry Quote</Button></View> : null}
    {quote ? <>
      <View style={styles.totalRow}><Text style={styles.note}>Items</Text><Text style={styles.summaryAmount}>{formatCurrency(quote.itemSubtotal, quote.currency)}</Text></View>
      <View style={styles.totalRow}><Text style={styles.note}>Seller to pickup point</Text><Text style={styles.summaryAmount}>{formatCurrency(quote.pickupDeliveryCost, quote.currency)}</Text></View>
      {deliveryMethod === 'doorstep' ? <View style={styles.totalRow}><Text style={styles.note}>Pickup point to home ({((quote.doorstepDistanceMeters ?? 0) / 1000).toFixed(2)} km)</Text><Text style={styles.summaryAmount}>{formatCurrency(quote.doorstepDeliveryCost, quote.currency)}</Text></View> : null}
      <View style={styles.totalRow}><Text style={styles.note}>Total delivery</Text><Text style={styles.summaryAmount}>{formatCurrency(quote.shippingCost, quote.currency)}</Text></View>
      <View style={styles.totalRow}><Text style={styles.note}>{paymentOption === 'pay_on_delivery' ? 'Pay now' : 'Total due'}</Text><Text style={styles.total}>{formatCurrency(dueNow, quote.currency)}</Text></View>
      {paymentOption === 'pay_on_delivery' ? <View style={styles.totalRow}><Text style={styles.note}>Due at delivery</Text><Text style={styles.summaryAmount}>{formatCurrency(quote.itemSubtotal, quote.currency)}</Text></View> : null}
    </> : null}
    {checkoutError && <Text style={styles.error} accessibilityRole="alert">{checkoutError}</Text>}
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    {orderCreationUncertain ? <Button variant="secondary" onPress={() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } })}>View My Orders</Button> : null}
    <View style={styles.policyNotice}>
      <Text style={styles.policyNoticeText}>Placing an order confirms that you have reviewed the delivery terms.</Text>
      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Policies', { policyId: 'shipping-and-delivery' })} style={styles.policyLinkHit}>
        <Text style={styles.policyLink}>Shipping & Delivery Policy</Text>
      </Pressable>
    </View>
    <Button onPress={() => void submit()} loading={busy} loadingLabel={stage === 'creating-order' ? 'Creating order' : 'Requesting payment'} disabled={busy || orderCreationUncertain || checkoutLoading || (!isBuyNow && cart.mutating) || !checkoutItemCount || !deliveryPayload || !isOrderPaymentPhone(phoneNumber) || pickupPointsQuery.isFetching || pickupPointsQuery.isError || quoteQuery.isFetching || quoteQuery.isError || !quote || pickupQuoteIncomplete || Boolean(checkoutError)}>{paymentOption === 'pay_on_delivery' ? 'Pay Delivery Fee & Place Order' : 'Place Order & Pay'}</Button>
  </View>;
  return <SafeAreaView style={styles.container}><FlatList testID="checkout-scroll" style={styles.scroll} data={checkoutItems} keyExtractor={item => item.id}
    renderItem={({ item }) => <View style={styles.itemRow}><Text style={styles.itemName}>{item.name}{item.optionLabel ? ` · ${item.optionLabel}` : ''} x {item.quantity}{item.priceUnit ? ` ${item.priceUnit}` : ''}</Text><Text style={styles.itemPrice}>{item.optionUnavailable ? 'Unavailable' : formatCurrency(item.price * item.quantity)}</Text></View>}
    ListHeaderComponent={header} ListFooterComponent={footer}
    ListEmptyComponent={<Text style={styles.note}>{checkoutError ? 'Checkout selection unavailable. Go back and retry.' : checkoutLoading ? 'Loading your selection...' : 'Your cart is empty.'}</Text>} contentContainerStyle={styles.content} /></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  gateContent: { flexGrow: 1, justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  address: { padding: theme.spacing.md, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm },
  selectedAddress: { borderColor: theme.colors.primary.DEFAULT, borderWidth: 2 },
  addressName: { fontWeight: '700', color: theme.colors.ink },
  note: { color: theme.colors.muted, marginVertical: theme.spacing.xs },
  confirmationBreakdown: { width: '100%', marginTop: theme.spacing.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  itemName: { flex: 1, color: theme.colors.ink },
  itemPrice: { color: theme.colors.ink, fontWeight: '700' },
  footer: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  summaryAmount: { color: theme.colors.ink, fontWeight: '700' },
  paymentOptions: { flexDirection: 'row', gap: theme.spacing.sm },
  paymentOptionsCompact: { flexDirection: 'column' },
  paymentOption: { flex: 1, minHeight: 76, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  paymentOptionCompact: { flex: 0, width: '100%' },
  paymentOptionSelected: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  paymentOptionTitle: { color: theme.colors.ink, fontWeight: '800' },
  paymentOptionTitleSelected: { color: theme.colors.primary.dark },
  paymentOptionNote: { color: theme.colors.muted, marginTop: 4, fontSize: theme.typography.small.fontSize },
  quoteState: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  quoteError: { gap: theme.spacing.sm, alignItems: 'stretch' },
  quoteHint: { color: theme.colors.muted, textAlign: 'center', fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  policyNotice: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  policyNoticeText: { color: theme.colors.muted, textAlign: 'center', fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  policyLinkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  policyLink: { color: theme.colors.primary.DEFAULT, fontWeight: '700', textDecorationLine: 'underline' },
  attribution: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  attributionLink: { color: theme.colors.primary.DEFAULT, textDecorationLine: 'underline', fontSize: theme.typography.small.fontSize },
  error: { color: theme.colors.error, textAlign: 'center' },
  confirmation: { flex: 1, minHeight: 0, backgroundColor: theme.colors.cream },
  confirmationContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  confirmationText: { maxWidth: 520, textAlign: 'center', color: theme.colors.muted, marginTop: theme.spacing.md, lineHeight: 22 },
  orderMeta: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.md },
  actions: { alignSelf: 'stretch', maxWidth: 520, width: '100%', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
});
