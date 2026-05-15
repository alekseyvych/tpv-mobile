import '@/i18n/config';

import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContextGuard } from '@/components/guards/ContextGuard';
import { QuickAccessAuthModal } from '@/components/auth/QuickAccessAuthModal';
import { Spinner } from '@/components/Spinner';
import { UserMenuModal } from '@/components/header/UserMenuModal';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useDevicePairing } from '@/hooks/useDevicePairing';
import { useSync } from '@/hooks/useSync';
import { useAutoLock } from '@/hooks/useAutoLock';
import { markActivity } from '@/hooks/auto-lock.activity';
import { useAuthStore } from '@/store/auth.store';
import { useContextStore } from '@/store/context.store';
import { usePaymentRuntimeStore } from '@/store/payment-runtime.store';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PINLoginScreen } from '@/screens/auth/PINLoginScreen';
import { SetupScreen } from '@/screens/auth/SetupScreen';
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
  isShellRouteEnabledForTerminal,
  resolveShellRoute,
  usesDiningFloorNavigation,
  type ShellRouteName,
} from '@/navigation/shellRouteGuards';
import { MoreScreen } from '@/features/more/screens/MoreScreen';
import { useTerminalStore } from '@/store/terminal.store';

type RootStackParamList = {
  FirstInit: undefined;
  ContextCheck: undefined;
  Login: undefined;
  PinLogin: undefined;
  Setup: undefined;
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
  KitchenDisplay: undefined;
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
  SettingsDeviceInfo: undefined;
  SettingsLanguage: undefined;
  SettingsLogout: undefined;
  SettingsInactivity: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

function SetupFallback({ navigation }: { navigation: RootNavigation }) {
  return (
    <SetupScreen
      onGoLogin={() => navigation.replace('Login')}
      onConnected={() => navigation.replace('Home')}
      onStartPairing={() => navigation.navigate('PairingMethod')}
    />
  );
}

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
  const user = useAuthStore((s) => s.user);
  const authSessionVersion = useAuthStore((s) => s.authSessionVersion);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const operatingMode = useTerminalStore((s) => s.operatingMode);
  const capabilities = useTerminalStore((s) => s.capabilities);
  const cardRuntimePhase = usePaymentRuntimeStore((s) => s.cardRuntimePhase);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const userName = useMemo(() => {
    if (!user) return '';
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName.length > 0) return fullName;
    if (user.email?.length) return user.email;
    return user.id;
  }, [user]);

  const isSwapBlocked = cardRuntimePhase !== 'idle';

  const isShellRouteEnabled = useMemo(
    () =>
      (route: string) =>
        isShellRouteEnabledForTerminal(
          route,
          Boolean(selectedTerminalId),
          operatingMode,
          capabilities,
        ),
    [capabilities, operatingMode, selectedTerminalId],
  );

  async function handleLogout() {
    await logout();
    setUserMenuOpen(false);
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
    setUserMenuOpen(false);
  }

  return (
    <ContextGuard fallback={<SetupFallback navigation={navigation} />}>
      <AppShellRouter
        key={authSessionVersion}
        currentRoute={currentRoute}
        isKitchenMode={isKitchenMode}
        user={user}
        onOpenUserMenu={() => setUserMenuOpen(true)}
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

      <UserMenuModal
        visible={userMenuOpen}
        userName={userName}
        swapBlocked={isSwapBlocked}
        swapBlockedMessage={t('header.userMenu.swapBlockedUnsafeCardRuntime')}
        onClose={() => setUserMenuOpen(false)}
        onOpenOptions={() => {
          setUserMenuOpen(false);
          navigation.navigate('Settings');
        }}
        onLogout={() => {
          void handleLogout();
        }}
        onSwap={() => {
          if (isSwapBlocked) return;
          setSwapModalOpen(true);
        }}
      />

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
  const { ready, deviceInitialized } = useAppInitialization();
  const { queuedCount, isOnline, isSyncing, failedCount, syncNow } = useSync();
  const { trackEvent, setContext } = useAnalytics();
  const { pairWithManualCode, pairWithToken, lastResult, reset } = useDevicePairing();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const localContext = useContextStore((s) => s.localContext);
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const operatingMode = useTerminalStore((s) => s.operatingMode);
  const capabilities = useTerminalStore((s) => s.capabilities);
  const [currentRouteName, setCurrentRouteName] = useState<string>('Login');
  const isRouteEnabled = (route: string) =>
    isShellRouteEnabledForTerminal(route, Boolean(selectedTerminalId), operatingMode, capabilities);

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

  useEffect(() => {
    void trackEvent('app.started');
  }, [trackEvent]);

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
              onSetupRequired={() => navigation.replace('Setup')}
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
          name="Setup"
          children={({ navigation }) => (
            <SetupScreen
              onGoLogin={() => navigation.navigate('Login')}
              onConnected={() => navigation.replace('Home')}
              onStartPairing={() => navigation.navigate('PairingMethod')}
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
                onGoQuickAccess={() => navigation.navigate('PinLogin')}
                onGoDining={() =>
                  navigation.navigate(
                    usesDiningFloorNavigation(operatingMode, capabilities) ? 'DiningFloor' : 'Checkout',
                  )
                }
                onGoKitchen={() => navigation.navigate('KitchenDisplay')}
                onGoPos={() => navigation.navigate('TerminalSelection', { target: 'Checkout' })}
                onGoAppointments={() => navigation.navigate('AppointmentsList')}
                onGoSettings={() => navigation.navigate('Settings')}
                queuedSyncCount={queuedCount}
                syncFailedCount={failedCount}
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
                  onOpenTable={() => navigation.navigate('TableDetail')}
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
          children={({ navigation }) => (
            <AuthenticatedShellScreen navigation={navigation} currentRoute="KitchenDisplay">
              <KitchenDisplayScreen onBack={() => navigation.goBack()} />
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
