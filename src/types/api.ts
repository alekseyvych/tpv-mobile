/**
 * API Error Response (Normalized from backend)
 * Backend returns HTTP 500 or higher error codes with standardized error envelope
 */
export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type RuntimeCompatibilityResponse = {
  status: string;
  code: string;
  message: string;
  updateRequired: boolean;
  updateRecommended: boolean;
  latestRelease: {
    id: string;
    version: string;
    platform: string;
    channel: string;
    mandatory: boolean;
    rolloutPercent: number;
    minimumSupportedVersion: string;
    recommendedVersion: string;
    supportedVersionRange: string;
    minimumRuntimeVersion: string;
    artifactUrl: string;
    checksum: string;
    checksumAlgorithm: string;
    releaseNotes?: string | null;
    publishedAt?: string | null;
    platformManifestUrl?: string;
    bootstrapManifestUrl?: string;
    assignmentManifestUrl?: string;
    migrationManifestUrl?: string;
    bootstrapVersion?: string;
    requiresInitializedBootstrap?: boolean;
    bootstrapPolicyMode?: string;
  } | null;
  platformVersion: string;
  backendVersion: string;
  minimumMobileVersion: string;
  supportedMobileVersionRange: string;
  minimumRuntimeVersion: string;
  logSchemaVersion: string;
  metricsSchemaVersion: string;
  checkedAt: string;
  client?: {
    appVersion?: string;
    buildNumber?: string;
    runtimeVersion?: string;
    platform?: string;
    deviceId?: string;
  };
};

/**
 * ==================== AUTHENTICATION CONTRACTS ====================
 */

/**
 * JWT-based auth tokens returned by login endpoints
 * accessToken: Short-lived JWT (15-60 min typical)
 * refreshToken: Long-lived token for renewal (7-30 days typical)
 * expiresIn: Seconds until accessToken expiration
 * user: Current user profile
 */
export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfileDto;
};

/**
 * Login request: email + password
 */
export type LoginDto = {
  email: string;
  password: string;
};

/**
 * Login request: 4-digit PIN
 * pin: "1234" format, validated with regex ^\\d{4}$
 * tenantId: Optional, for multi-tenant fallback
 */
export type LoginPinDto = {
  pin: string;
  tenantId?: string;
};

/**
 * Quick Access login: select user + PIN
 * userId: ID from quick-access profiles list
 * pin: 4-digit staff PIN
 * terminalId: Optional, POS terminal public ID
 * tenantId: Optional, fallback tenant for routing
 */
export type QuickAccessLoginDto = {
  userId: string;
  pin: string;
  terminalId?: string;
  tenantId?: string;
};

/**
 * Quick Access profile: staff user available for quick login
 */
export type QuickAccessProfileDto = {
  id: string;
  displayName: string;
  initials: string;
  role?: string;
};

/**
 * Quick Access profiles with context: list + setup check
 * users: Array of staff profiles available for PIN entry
 * setupRequired: Whether device context needs initialization
 * reason: Why setup is required (if setupRequired = true)
 */
export type QuickAccessProfilesWithContextDto = {
  users: QuickAccessProfileDto[];
  setupRequired: boolean;
  reason?: string;
};

/**
 * Current user profile from /auth/me
 * id: User UUID
 * email: User email
 * firstName, lastName: User name
 * roles: Array of role names (e.g., ["CASHIER", "WAITER"])
 * tenantId: Tenant context for multi-tenant isolation
 * active: Whether user account is active
 */
export type UserProfileDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions?: string[];
  tenantId: string;
  active: boolean;
};

/**
 * Refresh token request
 */
export type RefreshTokenDto = {
  refreshToken: string;
};

/**
 * Logout request (optional, may be no-op on mobile)
 */
export type LogoutDto = {
  refreshToken?: string;
};

export type ChangePasswordAuthDto = {
  oldPassword: string;
  newPassword: string;
};

/**
 * ==================== DEVICE PAIRING CONTRACTS ====================
 */

/**
 * Device pairing completion input
 * Either token (from QR) OR manualCode (from user entry) required
 * token: Base64-encoded QR payload with session credentials
 * manualCode: 8-char code in AAAA-BBBB format from backend
 * deviceName: Optional user-assigned device name (e.g., "Front Register")
 * installationId: Optional explicit installation ID if re-pairing
 */
export type DevicePairingCompletionDto = {
  token?: string;
  manualCode?: string;
  deviceName?: string;
  installationId?: string;
};

/**
 * Device pairing response
 * Confirms device has been bound to tenant + installation
 * deviceId: Unique ID for this device (UUID)
 * tenantId: Tenant this device is paired to (for X-Tenant-ID header)
 * installationId: Installation context (specific restaurant/venue)
 * deviceName: Device name (set during pairing or default)
 * deviceType: "POS" | "KITCHEN_DISPLAY" | "TABLETS" etc.
 * configuredAt: ISO timestamp of when pairing completed
 */
export type DevicePairingCompletionResponseDto = {
  deviceId: string;
  tenantId: string;
  installationId: string;
  deviceName?: string | null;
  deviceType: string;
  configuredAt: string;
};

/**
 * ==================== LOCAL INSTALLATION CONTEXT ====================
 */

/**
 * LocalInstallationContext: singleton per device
 * Stored in AsyncStorage, used to derive tenant + location context
 * Used by Quick Access to determine which tenant's staff profiles to load
 */
export type LocalInstallationContextDto = {
  id: string; // Installation UUID
  deviceId?: string; // Backing device registration UUID when available
  tenantId: string; // Tenant ID (used for X-Tenant-ID header)
  locationId?: string; // Location/site ID
  terminalId?: string; // Terminal/station ID
  installationId?: string; // Stable installation context when configured
  deviceName?: string; // User-friendly device name
  deviceType: string; // "POS" | "KITCHEN_DISPLAY" etc.
  configuredAt: string; // ISO timestamp
  configuredByUserId?: string; // User ID who configured pairing
  createdAt?: string;
  updatedAt?: string;
};

/**
 * ==================== RESTAURANT/DINING CONTRACTS ====================
 */

/**
 * Restaurant table: represents a physical table/seat
 * status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLOSED" etc.
 */
export type RestaurantTableDto = {
  id: string;
  name: string; // e.g., "Table 5", "Bar Seat 3"
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLOSED' | string;
  sectionId?: string; // Section/zone ID if restaurant has sections
  capacity?: number; // Max guests this table accommodates
  guestCount?: number; // Current guests at table
  updatedAt?: string; // ISO timestamp of last status change
};

/**
 * Restaurant order: order placed for a table
 * Created when waiter/staff submits items for a table
 */
export type RestaurantOrderDto = {
  id: string;
  tableId: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | string;
  items: OrderItemDto[]; // Order line items
  total?: number; // Total price for order (before tax)
  tax?: number; // Tax amount
  guestCount?: number; // Number of guests
  createdAt?: string; // ISO timestamp when order created
  updatedAt?: string; // ISO timestamp of last update
};

/**
 * Order item: individual dish/product in an order
 */
export type OrderItemDto = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | string;
  specialInstructions?: string; // Notes/modifications (no onions, etc.)
  createdAt?: string;
};

/**
 * ==================== KITCHEN DISPLAY CONTRACTS ====================
 */

/**
 * Kitchen pending item: order item awaiting preparation
 * Used on kitchen display screens
 */
export type KitchenPendingItemDto = {
  id: string;
  orderId: string;
  tableNumber: string; // For easy reference (e.g., "Table 5")
  productName: string;
  quantity: number;
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | string;
  specialInstructions?: string;
  priority: 'NORMAL' | 'HIGH' | 'RUSH' | string;
  createdAt: string; // ISO timestamp
  waitTimeSeconds?: number; // Calculated time waiting
};

/**
 * Kitchen order: aggregate of items for kitchen to prepare
 * Used internally for KDS display
 */
export type KitchenOrderDto = {
  id: string;
  tableNumber: string;
  items: KitchenPendingItemDto[];
  status: 'PENDING' | 'PREPARING' | 'READY' | string;
  createdAt: string;
};

/**
 * ==================== SALES/POS CONTRACTS ====================
 */

/**
 * Sale: represents a completed or in-progress transaction
 * Can have multiple line items and payments
 */
export type SaleDto = {
  id: string;
  tenantId: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | string;
  lines: SaleLineDto[];
  payments: PaymentDto[];
  subtotal: number;
  tax: number;
  total: number;
  discountAmount?: number;
  notes?: string;
  createdAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp when sale closed
};

/**
 * Sale line item: product in a sale
 */
export type SaleLineDto = {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  tax?: number;
  notes?: string;
};

/**
 * Create sale request: minimal input to start a new sale
 * Can include initial line items or start empty
 */
export type CreateSaleDto = {
  lines?: SaleLineInputDto[];
  discountAmount?: number;
  notes?: string;
};

/**
 * Sale line input for creation
 */
export type SaleLineInputDto = {
  productId: string;
  quantity: number;
  // Note: unitPrice is NOT sent — backend fetches price from product catalog
  notes?: string;
};

/**
 * Payment: money received for a sale
 * method: cash | card | transfer | check | etc.
 * amount: Amount paid with this payment method
 * amountTendered: For cash, amount given by customer (for change calculation)
 */
export type PaymentDto = {
  id?: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'GIFT_CARD' | string;
  amountTendered?: number; // For cash
  reference?: string; // Card ref, check#, etc.
  status?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | string;
};

/**
 * Complete sale request: finalize sale with payments
 * payments: Array of payments applied to this sale
 */
export type CompleteSaleDto = {
  payments: PaymentDto[];
  consumeStockLineItemIds?: string[];
};

/**
 * Receipt: post-sale record
 * Can be printed, emailed, or displayed
 */
export type ReceiptDto = {
  id: string;
  saleId: string;
  saleNumber: string;
  timestamp: string; // ISO timestamp
  cashier?: string;
  lines: ReceiptLineDto[];
  subtotal: number;
  tax: number;
  total: number;
  payments: PaymentDto[];
  receiptNumber?: string; // For re-printing
};

export type ReceiptLineDto = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/**
 * Refund: reverse/partial refund of a sale
 * refundAmount: Amount to refund (can be partial)
 * reason: Why refund was issued
 */
export type RefundDto = {
  id: string;
  saleId: string;
  refundAmount: number;
  originalAmount: number;
  reason?: string;
  createdAt: string;
  processedBy?: string;
};

/**
 * ==================== APPOINTMENTS CONTRACTS ====================
 */

/**
 * Appointment: scheduled service/availability
 */
export type AppointmentDto = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  type: 'consultation' | 'repair' | 'maintenance' | 'delivery' | 'other';
  title: string;
  description?: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // Minutes
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  assignedTo?: string | null;
  assignedToName?: string | null;
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

/**
 * Create appointment request
 */
export type CreateAppointmentDto = {
  customerId: string;
  type: 'consultation' | 'repair' | 'maintenance' | 'delivery' | 'other';
  title: string;
  description?: string;
  startTime: string; // ISO timestamp
  duration: number; // Minutes
  assignedTo?: string;
  notes?: string;
};

export type UpdateAppointmentDto = {
  type?: 'consultation' | 'repair' | 'maintenance' | 'delivery' | 'other';
  title?: string;
  description?: string;
  startTime?: string;
  duration?: number;
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  assignedTo?: string | null;
  notes?: string;
};

export type AppointmentFiltersDto = {
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type?: 'consultation' | 'repair' | 'maintenance' | 'delivery' | 'other';
  assignedTo?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type AppointmentAvailabilitySlotDto = {
  start: string;
  end: string;
};

export type AppointmentCustomerPickDto = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
};

export type AppointmentStaffPickDto = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

/**
 * ==================== PAGINATION CONTRACTS ====================
 */

/**
 * Pagination metadata in responses
 */
export type PaginationMetadataDto = {
  total: number; // Total items matching query
  page: number; // Current page (1-indexed)
  limit: number; // Items per page
  totalPages: number; // Calculated total pages
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponseDto<T> = {
  data: T[];
  meta: PaginationMetadataDto;
};

/**
 * ==================== BACKWARDS COMPAT ALIASES ====================
 * Keep old type names for smooth migration of existing code
 */

export type AuthTokens = AuthTokenResponse;
export type LoginResponse = AuthTokenResponse;
export type QuickAccessProfile = QuickAccessProfileDto;
export type QuickAccessProfilesWithContext = QuickAccessProfilesWithContextDto;
export type PairingCompletionInput = DevicePairingCompletionDto;
export type PairingCompletionResponse = DevicePairingCompletionResponseDto;
export type RestaurantTable = RestaurantTableDto;
export type RestaurantOrder = RestaurantOrderDto;
