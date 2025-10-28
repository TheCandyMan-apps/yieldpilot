/**
 * UK Landlord Compliance Checks
 * Validates properties against UK landlord regulations
 */

export interface ComplianceCheck {
  check_type: string;
  status: 'pass' | 'warn' | 'fail';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action_required?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceReport {
  listing_id: string;
  checks: ComplianceCheck[];
  overall_status: 'pass' | 'warn' | 'fail';
  critical_count: number;
  high_count: number;
  checked_at: string;
}

/**
 * Check EPC compliance (target C by 2028 for new tenancies)
 */
export function checkEPCCompliance(
  epcRating?: string,
  propertyType?: string
): ComplianceCheck {
  const rating = epcRating?.toUpperCase();
  const targetYear = 2028;

  if (!rating || rating === 'UNKNOWN') {
    return {
      check_type: 'epc_rating',
      status: 'warn',
      severity: 'high',
      message: 'EPC rating unknown - certificate required for all rental properties',
      action_required: 'Obtain EPC certificate before letting',
      metadata: { current_rating: null, target_rating: 'C', target_year: targetYear },
    };
  }

  // A, B, C are compliant
  if (['A', 'B', 'C'].includes(rating)) {
    return {
      check_type: 'epc_rating',
      status: 'pass',
      severity: 'low',
      message: `EPC rating ${rating} meets current and future standards`,
      metadata: { current_rating: rating, target_rating: 'C', compliant: true },
    };
  }

  // D is currently OK but will need upgrade
  if (rating === 'D') {
    return {
      check_type: 'epc_rating',
      status: 'warn',
      severity: 'medium',
      message: `EPC rating D currently acceptable, but upgrade to C required by ${targetYear} for new tenancies`,
      action_required: `Plan EPC upgrade works (insulation, boiler, glazing) before ${targetYear}`,
      metadata: { current_rating: rating, target_rating: 'C', years_remaining: targetYear - new Date().getFullYear() },
    };
  }

  // E, F, G are non-compliant
  return {
    check_type: 'epc_rating',
    status: 'fail',
    severity: 'critical',
    message: `EPC rating ${rating} below minimum standard - cannot legally let without exemption`,
    action_required: 'Upgrade property to minimum EPC rating E (target C by 2028) or register valid exemption',
    metadata: { current_rating: rating, target_rating: 'C', legally_lettable: false },
  };
}

/**
 * Check flood risk
 */
export function checkFloodRisk(
  floodRisk?: number,
  surfaceWater?: number
): ComplianceCheck {
  const maxRisk = Math.max(floodRisk || 0, surfaceWater || 0);

  if (maxRisk === 0 || !maxRisk) {
    return {
      check_type: 'flood_risk',
      status: 'pass',
      severity: 'low',
      message: 'Low or no flood risk identified',
      metadata: { flood_risk: floodRisk, surface_water: surfaceWater },
    };
  }

  if (maxRisk <= 3) {
    return {
      check_type: 'flood_risk',
      status: 'warn',
      severity: 'medium',
      message: 'Moderate flood risk - consider flood insurance and mitigation',
      action_required: 'Review flood insurance options and property resilience measures',
      metadata: { flood_risk: floodRisk, surface_water: surfaceWater, risk_level: 'moderate' },
    };
  }

  return {
    check_type: 'flood_risk',
    status: 'fail',
    severity: 'high',
    message: 'High flood risk - significant insurance and lending challenges',
    action_required: 'Obtain detailed flood risk assessment, confirm insurance availability and premium costs',
    metadata: { flood_risk: floodRisk, surface_water: surfaceWater, risk_level: 'high' },
  };
}

/**
 * Check lease length (for flats)
 */
export function checkLeaseLength(
  propertyType?: string,
  leaseYears?: number
): ComplianceCheck | null {
  if (propertyType?.toLowerCase() !== 'flat' && propertyType?.toLowerCase() !== 'apartment') {
    return null; // Not applicable to freehold
  }

  if (!leaseYears) {
    return {
      check_type: 'lease_length',
      status: 'warn',
      severity: 'medium',
      message: 'Lease length unknown for leasehold property',
      action_required: 'Verify remaining lease term - critical for mortgageability and value',
      metadata: { property_type: propertyType },
    };
  }

  if (leaseYears >= 90) {
    return {
      check_type: 'lease_length',
      status: 'pass',
      severity: 'low',
      message: `${leaseYears} years remaining - sufficient for lending`,
      metadata: { lease_years: leaseYears },
    };
  }

  if (leaseYears >= 80) {
    return {
      check_type: 'lease_length',
      status: 'warn',
      severity: 'medium',
      message: `${leaseYears} years remaining - consider lease extension soon`,
      action_required: 'Investigate lease extension costs before value diminishes further',
      metadata: { lease_years: leaseYears, marriage_value_threshold: 80 },
    };
  }

  return {
    check_type: 'lease_length',
    status: 'fail',
    severity: 'high',
    message: `${leaseYears} years remaining - mortgage and resale challenges`,
    action_required: 'Factor lease extension costs into purchase (typically £5k-15k + marriage value)',
    metadata: { lease_years: leaseYears, marriage_value_applies: true },
  };
}

/**
 * Check HMO licensing requirements
 */
export function checkHMOLicensing(
  bedrooms?: number,
  propertyType?: string,
  location?: string
): ComplianceCheck | null {
  if (!bedrooms || bedrooms < 3) {
    return null; // Not HMO territory
  }

  if (bedrooms >= 5) {
    return {
      check_type: 'hmo_licensing',
      status: 'warn',
      severity: 'high',
      message: `${bedrooms} bedrooms likely requires mandatory HMO licence`,
      action_required: 'Check local authority HMO licensing requirements, confirm property meets standards (fire doors, alarms, room sizes)',
      metadata: { bedrooms, mandatory_licence_threshold: 5 },
    };
  }

  return {
    check_type: 'hmo_licensing',
    status: 'warn',
    severity: 'medium',
    message: `${bedrooms} bedrooms may require Additional or Selective HMO licence depending on local authority`,
    action_required: 'Verify local HMO licensing scheme with council - Article 4 directions vary by area',
    metadata: { bedrooms, requires_local_check: true },
  };
}

/**
 * Check electrical safety
 */
export function checkElectricalSafety(): ComplianceCheck {
  return {
    check_type: 'electrical_safety',
    status: 'warn',
    severity: 'medium',
    message: 'Electrical Installation Condition Report (EICR) required every 5 years',
    action_required: 'Ensure valid EICR before letting and re-test every 5 years',
    metadata: { requirement: 'EICR every 5 years', regulation: 'Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020' },
  };
}

/**
 * Check gas safety
 */
export function checkGasSafety(hasGas: boolean = true): ComplianceCheck | null {
  if (!hasGas) return null;

  return {
    check_type: 'gas_safety',
    status: 'warn',
    severity: 'high',
    message: 'Annual Gas Safety Certificate required by law',
    action_required: 'Book Gas Safe registered engineer for annual inspection - legal requirement',
    metadata: { requirement: 'Annual gas safety check', regulation: 'Gas Safety (Installation and Use) Regulations 1998' },
  };
}

/**
 * Check smoke and CO alarms
 */
export function checkAlarmsCompliance(): ComplianceCheck {
  return {
    check_type: 'alarms',
    status: 'warn',
    severity: 'medium',
    message: 'Smoke and CO alarms required on each floor',
    action_required: 'Install smoke alarm on each storey and CO alarm in rooms with solid fuel appliances',
    metadata: { requirement: 'Smoke alarms + CO alarms', regulation: 'Smoke and Carbon Monoxide Alarm (England) Regulations 2015' },
  };
}

/**
 * Generate full compliance report
 */
export function generateComplianceReport(
  listingId: string,
  enrichment?: any,
  propertyData?: any
): ComplianceReport {
  const checks: ComplianceCheck[] = [];

  // EPC check
  const epcCheck = checkEPCCompliance(enrichment?.epc_current, propertyData?.property_type);
  checks.push(epcCheck);

  // Flood risk check
  if (enrichment?.flood_risk !== undefined || enrichment?.surface_water !== undefined) {
    const floodCheck = checkFloodRisk(enrichment.flood_risk, enrichment.surface_water);
    checks.push(floodCheck);
  }

  // Lease length check (for flats)
  const leaseCheck = checkLeaseLength(propertyData?.property_type, enrichment?.lease_years);
  if (leaseCheck) checks.push(leaseCheck);

  // HMO licensing check
  const hmoCheck = checkHMOLicensing(propertyData?.bedrooms, propertyData?.property_type, propertyData?.city);
  if (hmoCheck) checks.push(hmoCheck);

  // Electrical safety
  checks.push(checkElectricalSafety());

  // Gas safety (assume most properties have gas)
  const gasCheck = checkGasSafety(true);
  if (gasCheck) checks.push(gasCheck);

  // Alarms
  checks.push(checkAlarmsCompliance());

  // Calculate summary
  const critical_count = checks.filter(c => c.severity === 'critical').length;
  const high_count = checks.filter(c => c.severity === 'high').length;
  
  let overall_status: 'pass' | 'warn' | 'fail' = 'pass';
  if (checks.some(c => c.status === 'fail')) {
    overall_status = 'fail';
  } else if (checks.some(c => c.status === 'warn')) {
    overall_status = 'warn';
  }

  return {
    listing_id: listingId,
    checks,
    overall_status,
    critical_count,
    high_count,
    checked_at: new Date().toISOString(),
  };
}

/**
 * Get compliance status color
 */
export function getComplianceColor(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass': return 'success';
    case 'warn': return 'warning';
    case 'fail': return 'destructive';
  }
}

/**
 * Get severity badge variant
 */
export function getSeverityVariant(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'low': return 'secondary';
    case 'medium': return 'default';
    case 'high': return 'warning';
    case 'critical': return 'destructive';
  }
}
