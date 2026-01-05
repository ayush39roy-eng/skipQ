/**
 * Geofencing Utilities
 * 
 * Provides deterministic distance calculations and order type classification
 * based on user proximity to vendor locations.
 */

export enum OrderType {
  SELF_ORDER = 'SELF_ORDER',
  PRE_ORDER = 'PRE_ORDER'
}

/**
 * Calculate distance between two geographic coordinates using the Haversine formula
 * 
 * @param lat1 Latitude of point 1 (decimal degrees)
 * @param lon1 Longitude of point 1 (decimal degrees)
 * @param lat2 Latitude of point 2 (decimal degrees)
 * @param lon2 Longitude of point 2 (decimal degrees)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Determine order type based on distance from vendor
 * 
 * @param distanceMeters Distance from vendor in meters
 * @param radiusMeters Geofence radius in meters
 * @returns OrderType classification
 */
export function determineOrderType(
  distanceMeters: number,
  radiusMeters: number
): OrderType {
  return distanceMeters <= radiusMeters ? OrderType.SELF_ORDER : OrderType.PRE_ORDER
}

/**
 * Validate location accuracy
 * 
 * @param accuracy Location accuracy in meters
 * @param threshold Maximum acceptable accuracy (default: 100m)
 * @returns true if accuracy is acceptable
 */
export function isLocationAccurate(
  accuracy: number | null | undefined,
  threshold: number = 100
): boolean {
  if (accuracy === null || accuracy === undefined) {
    return true // No accuracy data provided, we'll accept it
  }
  return accuracy <= threshold
}

/**
 * Order Type Resolution Result
 */
export type OrderTypeResolutionResult = {
  finalOrderType: OrderType
  autoConverted: boolean
  autoConversionReason: string | null
}

/**
 * Order Type Resolution Input
 */
export type OrderTypeResolutionInput = {
  selectedOrderType: OrderType
  distanceMeters: number | null
  radiusMeters: number
  locationAccuracy: number | null | undefined
  vendorLocationAvailable: boolean
}

/**
 * Resolve final order type from user intent with backend enforcement
 * 
 * CRITICAL RULES:
 * - PRE_ORDER is NEVER upgraded to SELF_ORDER (user intent is respected)
 * - SELF_ORDER may be downgraded to PRE_ORDER if conditions aren't met
 * - Backend is the final authority
 * 
 * Downgrade conditions:
 * 1. User is outside geofence radius
 * 2. Location accuracy is too low (> 100m)
 * 3. Vendor location is unavailable
 * 4. User location is not provided
 * 
 * @param input Resolution parameters
 * @returns Final order type with auto-conversion flags
 */
export function resolveOrderType(input: OrderTypeResolutionInput): OrderTypeResolutionResult {
  const { selectedOrderType, distanceMeters, radiusMeters, locationAccuracy, vendorLocationAvailable } = input
  
  // Rule 1: User selected PRE_ORDER → always honor it (never upgrade)
  if (selectedOrderType === OrderType.PRE_ORDER) {
    return {
      finalOrderType: OrderType.PRE_ORDER,
      autoConverted: false,
      autoConversionReason: null
    }
  }
  
  // User selected SELF_ORDER → validate all conditions
  
  // Rule 2: Low location accuracy → force PRE_ORDER
  if (!isLocationAccurate(locationAccuracy, 100)) {
    return {
      finalOrderType: OrderType.PRE_ORDER,
      autoConverted: true,
      autoConversionReason: 'LOW_LOCATION_ACCURACY'
    }
  }
  
  // Rule 3: Vendor location unavailable → force PRE_ORDER
  if (!vendorLocationAvailable) {
    return {
      finalOrderType: OrderType.PRE_ORDER,
      autoConverted: true,
      autoConversionReason: 'VENDOR_LOCATION_UNAVAILABLE'
    }
  }
  
  // Rule 4: Distance not available → force PRE_ORDER (defensive)
  if (distanceMeters === null) {
    return {
      finalOrderType: OrderType.PRE_ORDER,
      autoConverted: true,
      autoConversionReason: 'LOCATION_NOT_PROVIDED'
    }
  }
  
  // Rule 5: Outside geofence → force PRE_ORDER
  if (distanceMeters > radiusMeters) {
    return {
      finalOrderType: OrderType.PRE_ORDER,
      autoConverted: true,
      autoConversionReason: 'OUTSIDE_GEOFENCE'
    }
  }
  
  // All conditions met → honor SELF_ORDER
  return {
    finalOrderType: OrderType.SELF_ORDER,
    autoConverted: false,
    autoConversionReason: null
  }
}
