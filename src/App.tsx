import '@/i18n/config';

import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContextGuard } from '@/components/guards/ContextGuard';
import { Button } from '@/components/Button';
import { QuickAccessAuthModal } from '@/components/auth/QuickAccessAuthModal';
import { Spinner } from '@/components/Spinner';
import { TopbarUserMenuProvider } from '@/components/header/TopbarUserMenuContext';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useDevicePairing } from '@/hooks/useDevicePairing';
import { useSync } from '@/hooks/useSync';
import { useAutoLock } from '@/hooks/useAutoLock';
import { usePermissionSync } from '@/hooks/usePermissionSync';
import { useRuntimeCompatibility } from '@/hooks/useRuntimeCompatibility';
import { markActivity } from '@/hooks/auto-lock.activity';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { mobileLogTransportService } from '@/services/MobileLogTransportService';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { usePaymentRuntimeStore } from '@/store/payment-runtime.store';
import { useRestaurantStore } from '@/store/restaurant.store';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PINLoginScreen } from '@/screens/auth/PINLoginScreen';
import { AppointmentsListScreen } from '@/screens/appointments/AppointmentsListScreen';
import { BookAppointmentScreen } from '@/screens/appointments/BookAppointmentScreen';
import { AppointmentDetailScreen } from '@/screens/appointments/AppointmentDetailScreen';
import { LocalContextCheckScreen } from '@/screens/context/LocalContextCheckScreen';
import { DiningFloorScreen } from '@/screens/dining/DiningFloorScreen';
import { TableDetailScreen } from '@/screens/dining/TableDetailScreen';
import { OrderCreationScreen } from '@/screens/dining/OrderCreationScreen';
import { RestaurantCheckoutScreen } from '@/screens/dining/RestaurantCheckoutScreen';
import { KitchenDisplayScreen } from '@/screens/kitchen/KitchenDisplayScreen';
import { CartScreen } from '@/screens/pos/CartScreen';
import { CheckoutScreen } from '@/screens/pos/CheckoutScreen';
import { PaymentScreen } from '@/screens/pos/PaymentScreen';
import { ReceiptScreen } from '@/screens/pos/ReceiptScreen';
import { FirstInitScreen } from '@/screens/pairing/FirstInitScreen';
import { ManualCodeScreen } from '@/screens/pairing/ManualCodeScreen';
import { PairingErrorScreen } from '@/screens/pairing/PairingErrorScreen';
import { PairingLoadingScreen } from '@/screens/pairing/PairingLoadingScreen';
import { PairingMethodScreen } from '@/screens/pairing/PairingMethodScreen';
import { PairingSuccessScreen } from '@/screens/pairing/PairingSuccessScreen';
import { QRScanScreen } from '@/screens/pairing/QRScanScreen';
import { markDeviceInitialized } from '@/utils/storage';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { DeviceInfoScreen } from '@/screens/settings/DeviceInfoScreen';
import { LanguageScreen } from '@/screens/settings/LanguageScreen';
import { InactivitySettingsScreen } from '@/screens/settings/InactivitySettingsScreen';
import { LogoutConfirmationScreen } from '@/screens/settings/LogoutConfirmationScreen';
import { MyPermissionsScreen } from '@/screens/settings/MyPermissionsScreen';
import { ProfileScreen } from '@/screens/settings/ProfileScreen';
import { SettingsContainerScreen } from '@/screens/settings/SettingsContainerScreen';
import { TerminalSelectionScreen } from '@/features/terminal-selection/screens/TerminalSelectionScreen';
import { theme } from '@/components/theme/theme';
import { AppShellRouter } from '@/layouts/AppShellRouter';
import {
  canKeepCurrentRouteAfterSwap,
  resolveAccountSwapFallbackRoute,
} from '@/navigation/accountSwapRoute';
import {
  isShellRouteAccessible,
  resolveShellRoute,
  usesDiningFloorNavigation,
  type ShellRouteName,
} from '@/navigation/shellRouteGuards';
import { MoreScreen } from '@/features/more/screens/MoreScreen';
import { useTerminalStore } from '@/store/terminal.store';
import { useWaiterHomeStore } from '@/store/waiter-home.store';

type RootStackParamList = {
  FirstInit: undefined;
  ContextCheck: undefined;
  Login: undefined;
  PinLogin: undefined;
  TerminalSelection: { target?: 'Home' | 'Checkout' | 'DiningFloor' } | undefined;
  PairingMethod: undefined;
  PairingQr: undefined;
  PairingManual: undefined;
  PairingLoading: undefined;
  PairingSuccess: undefined;
  PairingError: undefined;
  Home: undefined;
  DiningFloor: undefined;
  TableDetail: undefined;
  OrderCreation: undefined;
  KitchenDisplay: { station?: 'kitchen' | 'bar' | 'all' } | undefined;
  Checkout: { source: 'restaurant'; tableId: string; orderId: string } | undefined;
  Cart: undefined;
  Payment: undefined;
  Receipt: undefined;
  AppointmentsList: undefined;
  BookAppointment: undefined;
  AppointmentDetail: { appointmentId: string };
  Settings: undefined;
  More: undefined;
  SettingsProfile: undefined;
  SettingsPermissions: undefined;
  SettingsDeviceInfo: undefined;
  SettingsLanguage: undefined;
  SettingsLogout: undefined;
  SettingsInactivity: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

function AuthenticatedShellScreen({
  navigation,
  currentRoute,
  children,
  isKitchenMode = false,
}: {
  navigation: RootNavigation;
  currentRoute: ShellRouteName;
  children: ReactNode;
  isKitchenMode?: boolean;
}) {
  const { t } = useTranslation();
  const { logout, swapAccountWithQuickAccess } = useAuth();
  const authSessionVersion = useAuthStore((s) => s.authSessionVersion);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const operatingMode = useTerminalStore((s) => s.operatingMode);
  const capabilities = useTerminalStore((s) => s.capabilities);
  const cardRuntimePhase = usePaymentRuntimeStore((s) => s.cardRuntimePhase);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const isSwapBlocked = cardRuntimePhase !== 'idle';

  const isShellRouteEnabled = useMemo(
    () =>
      (route: string) =>
        isShellRouteAccessible(
          route,
          Boolean(selectedTerminalId),
          operatingMode,
          capabilities,
          roles,
          permissions,
        ),
    [capabilities, operatingMode, permissions, roles, selectedTerminalId],
  );

  async function handleLogout() {
    await logout();
    navigation.replace('Login');
  }

  function currentStackRouteName(): string {
    const state = navigation.getState();
    return (state.routes[state.index]?.name ?? 'Home') as string;
  }

  async function handleSwapAuthenticated(userId: string, pin: string) {
    const nextUser = await swapAccountWithQuickAccess(userId, pin);
    const activeRouteName = currentStackRouteName();

    const swapRouteInput = {
      currentRouteName: activeRouteName,
      roles: nextUser.roles ?? [],
      permissions: nextUser.permissions ?? [],
      allowCheckoutFallback: cardRuntimePhase === 'idle',
      isShellRouteEnabled,
    };

    // Clear restaurant/dining context on swap to avoid stale UI
    const restaurantStore = useRestaurantStore.getState();
    restaurantStore.setSelectedTable(null);
    restaurantStore.setSelectedOrder(null);

    if (!canKeepCurrentRouteAfterSwap(swapRouteInput)) {
      const fallback = resolveAccountSwapFallbackRoute(swapRouteInput);
      if (fallback.name === 'TerminalSelection') {
        navigation.replace('TerminalSelection', fallback.params as RootStackParamList['TerminalSelection']);
      } else if (fallback.name === 'DiningFloor') {
        navigation.replace('DiningFloor');
      } else if (fallback.name === 'Checkout') {
        navigation.replace('Checkout');
      } else if (fallback.name === 'KitchenDisplay') {
        navigation.replace('KitchenDisplay');
      } else if (fallback.name === 'Settings') {
        navigation.replace('Settings');
      } else {
        navigation.replace('Home');
      }
    }

    setSwapModalOpen(false);
  }

  return (
    <ContextGuard fallback={<SetupFallback navigation={navigation} />}>
      <TopbarUserMenuProvider
        value={{
          onLogout: () => {
            void handleLogout();
          },
          onSwap: () => {
            if (isSwapBlocked) return;
            setSwapModalOpen(true);
          },
          swapBlocked: isSwapBlocked,
          swapBlockedMessage: t('header.userMenu.swapBlockedUnsafeCardRuntime'),
        }}
      >
        <AppShellRouter
          key={authSessionVersion}
          currentRoute={currentRoute}
          isKitchenMode={isKitchenMode}
          isRouteEnabled={(route) =>
            isShellRouteEnabled(route)
          }
          onNavigate={(route) => {
            const destination = resolveShellRoute(route);
            if (destination !== currentRoute) {
              if (destination === 'Checkout') {
                navigation.navigate('TerminalSelection', { target: 'Checkout' });
                return;
              }
              navigation.navigate(destination);
            }
          }}
        >
          {children}
        </AppShellRouter>
      </TopbarUserMenuProvider>

      <QuickAccessAuthModal
        visible={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title={t('header.userMenu.swapTitle')}
        description={t('header.userMenu.swapDescription')}
        submitLabel={t('header.userMenu.swapAccount')}
        onAuthenticated={handleSwapAuthenticated}
      />
    </ContextGuard>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgPage }}>
      <Spinner />
      <Text style={{ marginTop: theme.spacing.s2 }}>{t('common.loading')}</Text>
    </View>
  );
}

function RedirectOnMount({
  navigation,
  route,
  params,
}: {
  navigation: RootNavigation;
  route: keyof RootStackParamList;
  params?: RootStackParamList[keyof RootStackParamList];
}) {
  useEffect(() => {
    const replaceRoute = navigation.replace as (
      screen: keyof RootStackParamList,
      routeParams?: RootStackParamList[keyof RootStackParamList],
    ) => void;
    replaceRoute(route, params);
  }, [navigation, params, route]);

  return <LoadingScreen />;
}

export default function App() {
  const { t } = useTranslation();
  const { ready, deviceInitialized } = useAppInitialization();
  const { isOnline, isSyncing, syncNow } = useSync();
  const { trackEvent, setContext } = useAnalytics();
  const { pairWithManualCode, pairWithToken, lastResult, reset } = useDevicePairing();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  const logout = useAuthStore((s) => s.logout);
  const setSelectedTable = useRestaurantStore((s) => s.setSelectedTable);
  const setSelectedOrder = useRestaurantStore((s) => s.setSelectedOrder);
  const setResumeContext = useWaiterHomeStore((s) => s.setResumeContext);
  const localContext = useContextStore((s) => s.localContext);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const operatingMode = useTerminalStore((s) => s.operatingMode);
  const capabilities = useTerminalStore((s) => s.capabilities);
  const {
    status: compatibilityStatus,
    message: compatibilityMessage,
    updateRequired,
    updateRecommended,
    checkCompatibility,
  } = useRuntimeCompatibility();
  const [currentRouteName, setCurrentRouteName] = useState<string>('Login');
  const isRouteEnabled = (route: string) =>
    isShellRouteAccessible(
      route,
      Boolean(selectedTerminalId),
      operatingMode,
      capabilities,
      roles,
      permissions,
    );

  const autoLockHandlers = useMemo(
    () => ({
      onShortLock: () => {
        if (!navigationRef.isReady()) return;
        const route = navigationRef.getCurrentRoute()?.name;
        if (!route || route === 'PinLogin' || route === 'Login') return;
        navigationRef.navigate('PinLogin');
      },
      onLongInactivity: () => {
        void logout().finally(() => {
          if (!navigationRef.isReady()) return;
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        });
      },
    }),
    [logout],
  );

  useAutoLock({
    routeName: currentRouteName,
    onShortLock: autoLockHandlers.onShortLock,
    onLongInactivity: autoLockHandlers.onLongInactivity,
  });

  usePermissionSync();

  useEffect(() => {
    void trackEvent('app.started');
  }, [trackEvent]);

  useEffect(() => {
    mobileLogTransportService.start();
    void checkCompatibility();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkCompatibility();
        void mobileLogTransportService.flushNow();
        return;
      }

      if (state === 'background' || state === 'inactive') {
        void mobileLogTransportService.flushNow();
      }
    });

    return () => {
      subscription.remove();
      mobileLogTransportService.stop();
    };
  }, [checkCompatibility]);

  useEffect(() => {
    setContext({
      userId: user?.id,
      tenantId: user?.tenantId,
      deviceType: localContext?.deviceType,
      appVersion: '1.0.0',
    });
  }, [localContext?.deviceType, setContext, user?.id, user?.tenantId]);

  if (!ready) {
    return <LoadingScreen />;
  }

  if (updateRequired || compatibilityStatus === 'required') {
    return (
      <AppProviders>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.s6,
            backgroundColor: theme.colors.bgPage,
          }}
        >
          <Text
            style={{
              fontSize: theme.typography.sizeXl,
              fontFamily: theme.typography.fontUi,
              fontWeight: theme.typography.weightBold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.s3,
              textAlign: 'center',
            }}
          >
            {t('compatibility.requiredTitle')}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.sizeBase,
              fontFamily: theme.typography.fontUi,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.s6,
              textAlign: 'center',
            }}
          >
            {compatibilityMessage || t('compatibility.requiredDescription')}
          </Text>
          <Button title={t('common.retry')} onPress={() => void checkCompatibility()} />
        </View>
      </AppProviders>
    );
  }

  // On first launch (device never initialized), entry point is QR pairing.
  // After successful first pairing, deviceInitialized is persisted and this branch never runs again.
  const initialRoute = deviceInitialized ? 'ContextCheck' : 'FirstInit';

  return (
    <AppProviders>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setCurrentRouteName(navigationRef.getCurrentRoute()?.name ?? 'Login');
        }}
        onStateChange={() => {
          markActivity();
          const route = navigationRef.getCurrentRoute()?.name ?? currentRouteName;
          if (route !== currentRouteName) {
            setCurrentRouteName(route);
          }
        }}
      >
        {updateRecommended || compatibilityStatus === 'unknown' ? (
          <View
            style={{
              backgroundColor: updateRecommended ? theme.colors.warning : theme.colors.info,
              paddingHorizontal: theme.spacing.s4,
              paddingVertical: theme.spacing.s2,
            }}
          >
            <Text
              style={{
                color: theme.colors.textInverse,
                fontFamily: theme.typography.fontUi,
                fontSize: theme.typography.sizeSm,
              }}
            >
              {compatibilityMessage ||
                (updateRecommended
                  ? t('compatibility.recommendedDescription')
                  : t('compatibility.unreachableDescription'))}
            </Text>
          </View>
        ) : null}
        <SyncStatusBanner />
        <View
          style={{ flex: 1 }}
          onTouchStart={() => {
            markActivity();
          }}
        >
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="FirstInit"
          children={({ navigation }) => (
            <FirstInitScreen
              onScanned={(token) => {
                navigation.replace('PairingLoading');
                void pairWithToken(token)
                  .then(async () => {
                    await markDeviceInitialized();
                    // After device is paired, user still needs to login
                    // PairingSuccess screen will inform user, then navigate to ContextCheck
                    // which will route to Login if user not authenticated
                    navigation.replace('PairingSuccess');
                  })
                  .catch(() => navigation.replace('PairingError'));
              }}
              onUseManualCode={() => navigation.navigate('PairingManual')}
            />
          )}

        />
        <Stack.Screen
          name="ContextCheck"
          children={({ navigation }) => (
            <LocalContextCheckScreen
              onContextReady={() => navigation.replace('Home')}
              onSetupRequired={() => navigation.replace('PairingMethod')}
              onLoginRequired={() => navigation.replace('Login')}
            />
          )}
        />
        <Stack.Screen
          name="Login"
          children={({ navigation }) => (
            <LoginScreen
              onGoHome={() => navigation.replace('Home')}
              onGoPinLogin={() => navigation.navigate('PinLogin')}
            />
          )}
        />
        <Stack.Screen
          name="PinLogin"
          children={({ navigation }) => (
            <PINLoginScreen
              onBack={() => navigation.goBack()}
              onLoggedIn={() => navigation.replace('Home')}
            />
          )}
        />
        <Stack.Screen
          name="PairingMethod"
          children={({ navigation }) => (
            <PairingMethodScreen
              onChooseQr={() => navigation.navigate('PairingQr')}
              onChooseManual={() => navigation.navigate('PairingManual')}
              onBack={() => navigation.goBack()}
            />
          )}
        />
        <Stack.Screen
          name="PairingQr"
          children={({ navigation }) => (
            <QRScanScreen
              onBack={() => navigation.goBack()}
              onScanned={(token) => {
                navigation.replace('PairingLoading');
                void pairWithToken(token)
                  .then(() => navigation.replace('PairingSuccess'))
                  .catch(() => navigation.replace('PairingError'));
              }}
            />
          )}
        />
        <Stack.Screen
          name="PairingManual"
          children={({ navigation }) => (
            <ManualCodeScreen
              onBack={() => navigation.goBack()}
              onSubmitCode={(manualCode) => {
                navigation.replace('PairingLoading');
                void pairWithManualCode(manualCode)
                  .then(() => navigation.replace('PairingSuccess'))
                  .catch(() => navigation.replace('PairingError'));
              }}
            />
          )}
        />
        <Stack.Screen name="PairingLoading" component={PairingLoadingScreen} />
        <Stack.Screen
          name="PairingSuccess"
          children={({ navigation }) => (
            <PairingSuccessScreen
              installationId={lastResult?.installationId}
              onContinue={() => {
                reset();
                void markDeviceInitialized().then(() => navigation.replace('ContextCheck'));
              }}
            />
          )}
        />
        <Stack.Screen
          name="PairingError"
          children={({ navigation }) => (
            <PairingErrorScreen
              onBack={() => navigation.replace('PairingMethod')}
              onRetry={() => navigation.replace('PairingMethod')}
            />
          )}
        />
        <Stack.Screen
          name="TerminalSelection"
          children={({ navigation, route }) => {
            const target = route.params?.target;
            const shellRoute: ShellRouteName =
              target === 'DiningFloor' ? 'DiningFloor' : target === 'Checkout' ? 'Checkout' : 'Home';

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute={shellRoute}>
                <TerminalSelectionScreen />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="Home"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Home">
              <HomeScreen
                onGoDining={() =>
                  navigation.navigate(
                    usesDiningFloorNavigation(operatingMode, capabilities) ? 'DiningFloor' : 'Checkout',
                  )
                }
                onGoDiningFloor={() => {
                  if (!selectedTerminalId) {
                    navigation.navigate('TerminalSelection', { target: 'DiningFloor' });
                    return;
                  }
                  navigation.navigate('DiningFloor');
                }}
                onGoKitchen={() => navigation.navigate('KitchenDisplay')}
                onGoBar={() => navigation.navigate('KitchenDisplay', { station: 'bar' })}
                onGoPos={() => navigation.navigate('TerminalSelection', { target: 'Checkout' })}
                onGoAppointments={() => navigation.navigate('AppointmentsList')}
                onGoSettings={() => navigation.navigate('Settings')}
                onSelectTerminal={() => navigation.navigate('TerminalSelection', { target: 'DiningFloor' })}
                onOpenShift={() => navigation.navigate('DiningFloor')}
                onOpenTableContext={(tableId, orderId) => {
                  setSelectedTable(tableId);
                  setSelectedOrder(orderId ?? null);
                  setResumeContext({
                    tableId,
                    orderId,
                    terminalId: selectedTerminalId,
                  });
                  if (!selectedTerminalId) {
                    navigation.navigate('TerminalSelection', { target: 'DiningFloor' });
                    return;
                  }
                  navigation.navigate('TableDetail');
                }}
                isOnline={isOnline}
                isSyncing={isSyncing}
                onSyncNow={() => void syncNow()}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="AppointmentsList"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="AppointmentsList">
              <AppointmentsListScreen
                onBack={() => navigation.goBack()}
                onBook={() => navigation.navigate('BookAppointment')}
                onOpenAppointment={(appointmentId) =>
                  navigation.navigate('AppointmentDetail', { appointmentId })
                }
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="BookAppointment"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="AppointmentsList">
              <BookAppointmentScreen
                onBack={() => navigation.goBack()}
                onCreated={() => navigation.replace('AppointmentsList')}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="AppointmentDetail"
          children={({ navigation, route }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="AppointmentsList">
              <AppointmentDetailScreen
                appointmentId={route.params.appointmentId}
                onBack={() => navigation.goBack()}
                onUpdated={() => navigation.replace('AppointmentsList')}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="Checkout"
          children={({ navigation, route }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'Checkout' }}
                />
              );
            }
            const restaurantContext = route.params;
            if (restaurantContext?.source === 'restaurant') {
              return (
                <AuthenticatedShellScreen navigation={navigation} currentRoute="DiningFloor">
                  <RestaurantCheckoutScreen
                    tableId={restaurantContext.tableId}
                    orderId={restaurantContext.orderId}
                    onBack={() => navigation.goBack()}
                    onSuccess={() => navigation.navigate('DiningFloor')}
                  />
                </AuthenticatedShellScreen>
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="Checkout">
                <CheckoutScreen onBack={() => navigation.goBack()} onOpenCart={() => navigation.navigate('Cart')} />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="Cart"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'Checkout' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="Checkout">
                <CartScreen onBack={() => navigation.goBack()} onCheckout={() => navigation.navigate('Payment')} />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="Payment"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'Checkout' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="Checkout">
                <PaymentScreen onBack={() => navigation.goBack()} onPaid={() => navigation.replace('Receipt')} />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="Receipt"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'Checkout' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="Checkout">
                <ReceiptScreen onDone={() => navigation.replace('Checkout')} />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="DiningFloor"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'DiningFloor' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="DiningFloor">
                <DiningFloorScreen
                  onGoHome={() => navigation.navigate('Home')}
                  onOpenTable={(tableId) => {
                    setSelectedTable(tableId);
                    setResumeContext({
                      tableId,
                      terminalId: selectedTerminalId,
                    });
                    navigation.navigate('TableDetail');
                  }}
                />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="TableDetail"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'DiningFloor' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="DiningFloor">
                <TableDetailScreen />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="OrderCreation"
          children={({ navigation }) => {
            if (!selectedTerminalId) {
              return (
                <RedirectOnMount
                  navigation={navigation}
                  route="TerminalSelection"
                  params={{ target: 'DiningFloor' }}
                />
              );
            }

            return (
              <AuthenticatedShellScreen navigation={navigation} currentRoute="DiningFloor">
                <OrderCreationScreen />
              </AuthenticatedShellScreen>
            );
          }}
        />
        <Stack.Screen
          name="KitchenDisplay"
          children={({ navigation, route }) => (
            <AuthenticatedShellScreen
              navigation={navigation}
              currentRoute="KitchenDisplay"
              isKitchenMode={capabilities?.kitchenDisplayOnly === true}
            >
              <KitchenDisplayScreen
                onBack={() => navigation.goBack()}
                initialStation={route.params?.station}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="Settings"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <SettingsContainerScreen
                onBack={() => navigation.goBack()}
                onOpenProfile={() => navigation.navigate('SettingsProfile')}
                onOpenPermissions={() => navigation.navigate('SettingsPermissions')}
                onOpenDevice={() => navigation.navigate('SettingsDeviceInfo')}
                onOpenLanguage={() => navigation.navigate('SettingsLanguage')}
                onOpenLogout={() => navigation.navigate('SettingsLogout')}
                onOpenInactivity={() => navigation.navigate('SettingsInactivity')}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="More"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="More">
              <MoreScreen
                isRouteEnabled={isRouteEnabled}
                onNavigate={(route) => navigation.navigate(resolveShellRoute(route))}
              />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsProfile"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <ProfileScreen onBack={() => navigation.goBack()} />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsPermissions"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <MyPermissionsScreen onBack={() => navigation.goBack()} />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsDeviceInfo"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="SettingsDeviceInfo">
              <DeviceInfoScreen onBack={() => navigation.goBack()} />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsLanguage"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <LanguageScreen onBack={() => navigation.goBack()} />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsLogout"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <LogoutConfirmationScreen onBack={() => navigation.goBack()} onDone={() => navigation.replace('Login')} />
            </AuthenticatedShellScreen>
          )}
        />
        <Stack.Screen
          name="SettingsInactivity"
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="Settings">
              <InactivitySettingsScreen onBack={() => navigation.goBack()} />
            </AuthenticatedShellScreen>
          )}
        />
          </Stack.Navigator>
        </View>
      </NavigationContainer>
    </AppProviders>
  );
}
