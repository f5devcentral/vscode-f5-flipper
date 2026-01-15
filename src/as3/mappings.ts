/**
 * NetScaler to F5 BIG-IP Mappings
 * 
 * Direct conversion mappings from NS concepts to F5/AS3 equivalents.
 * Source: specs/NS_TO_F5_MAPPINGS.md
 * 
 * @module as3/mappings
 */

// ============================================================================
// LB Methods (NS_TO_F5_MAPPINGS.md Section 1)
// ============================================================================

export const LB_METHODS: Record<string, string> = {
    'ROUNDROBIN': 'round-robin',
    'LEASTCONNECTION': 'least-connections-member',
    'LEASTCONNECTIONS': 'least-connections-member',
    'LEASTRESPONSETIME': 'fastest-app-response',
    'LEASTBANDWIDTH': 'least-connections-member',      // No direct equivalent
    'LEASTPACKETS': 'least-connections-member',        // No direct equivalent
    'URLHASH': 'least-connections-member',             // Consider iRule
    'DOMAINHASH': 'least-connections-member',          // Consider iRule
    'DESTINATIONIPHASH': 'least-connections-member',   // Use destination persistence
    'SOURCEIPHASH': 'least-connections-member',        // Use source-address persistence
    'SRCIPDESTIPHASH': 'least-connections-member',     // No direct equivalent
    'CALLIDHASH': 'least-connections-member',          // Use SIP persistence
    'TOKEN': 'least-connections-member',               // Requires iRule
    'CUSTOMSERVERID': 'least-connections-member',      // Requires iRule
    'LRTM': 'fastest-app-response',                    // Least Response Time
};

/**
 * Get F5 LB method for NetScaler method
 */
export function getLbMethod(nsMethod: string | undefined): string {
    if (!nsMethod) return 'round-robin';
    return LB_METHODS[nsMethod.toUpperCase()] || 'round-robin';
}

// ============================================================================
// Persistence Types (NS_TO_F5_MAPPINGS.md Section 2)
// ============================================================================

export const PERSISTENCE_TYPES: Record<string, string | null> = {
    'SOURCEIP': 'source-address',
    'COOKIEINSERT': 'cookie',
    'SSLSESSION': 'tls-session-id',   // AS3 uses tls-session-id, not ssl
    'RULE': null,                     // Requires iRule - not auto-convertible
    'URLPASSIVE': 'cookie',           // Approximate
    'CUSTOMSERVERID': null,           // Requires iRule - not auto-convertible
    'DESTIP': 'destination-address',
    'SRCIPDESTIP': 'source-address',  // Using source only
    'CALLID': null,                   // SIP - requires additional config
    'RTSPSID': null,                  // RTSP - requires additional config
    'DIAMETER': null,                 // Requires iRule - not auto-convertible
    'NONE': null,
};

/**
 * Get F5 persistence method for NetScaler type
 */
export function getPersistence(nsType: string | undefined): string | null {
    if (!nsType) return null;
    const mapped = PERSISTENCE_TYPES[nsType.toUpperCase()];
    return mapped !== undefined ? mapped : null;
}

// ============================================================================
// Service Types / Service Classes (NS_TO_F5_MAPPINGS.md Section 4)
// ============================================================================

export const SERVICE_CLASSES: Record<string, string> = {
    'HTTP': 'Service_HTTP',
    'SSL': 'Service_HTTPS',
    'SSL_BRIDGE': 'Service_TCP',      // SSL pass-through
    'SSL_TCP': 'Service_TCP',
    'TCP': 'Service_TCP',
    'UDP': 'Service_UDP',
    'DNS': 'Service_UDP',
    'DNS_TCP': 'Service_TCP',
    'FTP': 'Service_TCP',
    'ANY': 'Service_L4',
    'SIP_UDP': 'Service_UDP',
    'SIP_TCP': 'Service_TCP',
    'SIP_SSL': 'Service_TCP',
    'RADIUS': 'Service_UDP',
    'RDP': 'Service_TCP',
    'RTSP': 'Service_TCP',
    'MYSQL': 'Service_TCP',
    'MSSQL': 'Service_TCP',
    'ORACLE': 'Service_TCP',
    'ADNS': 'Service_UDP',
    'ADNS_TCP': 'Service_TCP',
};

/**
 * Get F5 service class for NetScaler protocol
 */
export function getServiceClass(nsProtocol: string | undefined): string {
    if (!nsProtocol) return 'Service_TCP';
    return SERVICE_CLASSES[nsProtocol.toUpperCase()] || 'Service_TCP';
}

// ============================================================================
// Monitor Types (NS_TO_F5_MAPPINGS.md Section 3)
// ============================================================================

export const MONITOR_TYPES: Record<string, string> = {
    'HTTP': 'http',
    'HTTP-ECV': 'http',
    'HTTPS': 'https',
    'HTTPS-ECV': 'https',
    'TCP': 'tcp',
    'TCP-ECV': 'tcp',
    'UDP': 'udp',
    'UDP-ECV': 'udp',
    'PING': 'icmp',
    'DNS': 'dns',
    'FTP': 'ftp',
    'FTP-EXTENDED': 'ftp',
    'LDAP': 'ldap',
    'RADIUS': 'radius',
    'RADIUS_ACCOUNTING': 'radius',
    'MYSQL': 'mysql',
    'MYSQL-ECV': 'mysql',
    'MSSQL': 'external',              // Requires script
    'MSSQL-ECV': 'external',
    'ORACLE': 'external',             // Requires script
    'ORACLE-ECV': 'external',
    'SMTP': 'smtp',
    'POP3': 'external',               // Requires script
    'IMAP': 'external',               // Requires script
    'NNTP': 'external',
    'STOREFRONT': 'http',             // Custom HTTP check
    'CITRIX-XD-DDC': 'http',          // Custom HTTP check
    'CITRIX-WEB-INTERFACE': 'http',
    'USER': 'external',
    'SIP-UDP': 'sip',
    'SIP-TCP': 'sip',
    'RTSP': 'external',
    'ARP': 'icmp',
    'SNMP': 'external',
    'LOAD': 'external',
};

/**
 * Get F5 monitor type for NetScaler monitor type
 */
export function getMonitorType(nsType: string | undefined): string {
    if (!nsType) return 'tcp';
    return MONITOR_TYPES[nsType.toUpperCase()] || 'tcp';
}

// ============================================================================
// SNAT Types
// ============================================================================

export type SnatType = 'none' | 'automap' | 'pool';

/**
 * Get F5 SNAT setting
 */
export function getSnat(nsApp: { opts?: Record<string, any> }): 'auto' | 'none' | { use: string } {
    // NetScaler uses -usip (use source IP) = YES means no SNAT
    // Default in NS is typically SNAT (usip = NO)
    const usip = nsApp.opts?.['-usip'];
    
    if (usip === 'YES') {
        return 'none';
    }
    
    // Check for explicit SNAT pool
    const snatPool = nsApp.opts?.['-ipSet'] || nsApp.opts?.['-natPool'];
    if (snatPool) {
        return { use: snatPool };
    }
    
    // Default to automap (most common migration scenario)
    return 'auto';
}

// ============================================================================
// Ignorable Parameters (NS_TO_F5_MAPPINGS.md Section 14)
// ============================================================================

/**
 * Parameters that should be silently ignored during conversion.
 * These have no F5 equivalent or are NS-internal.
 */
export const IGNORABLE_PARAMS = new Set([
    // NS internal
    '-devno',
    '-state',                // Handled separately via enabled/disabled
    '-comment',              // Metadata only

    // NS-specific features with no direct F5 equivalent
    '-sc',                   // SureConnect - use OneConnect in F5
    '-sp',                   // Surge protection - use connection rate limiting
    '-cachetype',            // NS caching
    '-cacheable',

    // Policy ordering (NS-specific)
    '-precedence',
    '-priority',
    '-gotopriorityexpression',

    // Spillover (different architecture in F5)
    '-somethod',
    '-sothreshold',
    '-sopersistence',
    '-sopersistencetimeout',

    // State management
    '-downstateflush',
    '-stateupdate',

    // Traffic domains (Route Domains in F5 - separate config)
    '-td',

    // AppFlow (Analytics in F5 - separate config)
    '-appflowlog',
]);

/**
 * Check if a parameter should be ignored
 */
export function isIgnorable(param: string): boolean {
    return IGNORABLE_PARAMS.has(param.toLowerCase());
}

/**
 * Get reason why a parameter is ignored
 */
export function getIgnoreReason(param: string): string | undefined {
    const reasons: Record<string, string> = {
        '-devno': 'NetScaler internal device number',
        '-state': 'Handled via enabled/disabled property',
        '-comment': 'Metadata - use AS3 remark instead',
        '-sc': 'SureConnect - use OneConnect profile in F5',
        '-sp': 'Surge Protection - use connection rate limiting in F5',
        '-td': 'Traffic Domains - use Route Domains in F5 (separate config)',
        '-somethod': 'Spillover - use Priority Group Activation in F5',
        '-appflowlog': 'AppFlow - configure F5 Analytics separately',
    };
    return reasons[param.toLowerCase()];
}

// ============================================================================
// Protocol Abbreviations (AS3_NAMING_CONVENTION_SPEC.md Section 4)
// ============================================================================

/**
 * Protocol abbreviations for AS3 object naming.
 * Used in pattern: {app_name}_{protocol}{port}_{suffix}
 */
export const PROTOCOL_ABBREVIATIONS: Record<string, string> = {
    // Standard protocols
    'HTTP': 'http',
    'SSL': 'ssl',
    'SSL_BRIDGE': 'sslb',
    'SSL_TCP': 'sslt',
    'TCP': 'tcp',
    'UDP': 'udp',
    'DNS': 'dns',
    'DNS_TCP': 'dnst',
    'FTP': 'ftp',
    'ANY': 'any',

    // SIP variants
    'SIP_UDP': 'sipu',
    'SIP_TCP': 'sipt',
    'SIP_SSL': 'sips',

    // Other protocols
    'RADIUS': 'rad',
    'RDP': 'rdp',
    'RTSP': 'rtsp',
    'MYSQL': 'mysql',
    'MSSQL': 'mssql',
    'ORACLE': 'oracle',
    'DIAMETER': 'diam',
    'SMPP': 'smpp',
    'FIX': 'fix',
    'TFTP': 'tftp',
    'PPTP': 'pptp',

    // ADNS
    'ADNS': 'adns',
    'ADNS_TCP': 'adnst',
};

/**
 * Get protocol abbreviation for naming
 */
export function getProtocolAbbreviation(
    protocol: string | undefined,
    customAbbreviations?: Record<string, string>
): string {
    if (!protocol) return 'tcp';
    const upper = protocol.toUpperCase();

    // Check custom abbreviations first
    if (customAbbreviations && customAbbreviations[upper]) {
        return customAbbreviations[upper];
    }

    return PROTOCOL_ABBREVIATIONS[upper] || 'tcp';
}

// ============================================================================
// Naming Options (AS3_NAMING_CONVENTION_SPEC.md Section 8)
// ============================================================================

/**
 * Configuration options for AS3 object naming
 */
export interface NamingOptions {
    /** Tenant name prefix (default: 't') */
    tenantPrefix?: string;

    /** Include protocol in object names (default: true) */
    includeProtocol?: boolean;

    /** Include port in object names (default: true) */
    includePort?: boolean;

    /** Separator between name components (default: '_') */
    separator?: string;

    /** Custom protocol abbreviations (merge with defaults) */
    protocolAbbreviations?: Record<string, string>;

    /** Custom suffix overrides */
    suffixes?: {
        virtualServer?: string;
        pool?: string;
        monitor?: string;
        iRule?: string;
        snatPool?: string;
        clientSsl?: string;
        serverSsl?: string;
        httpProfile?: string;
        tcpProfile?: string;
        localTrafficPolicy?: string;
        persistence?: string;
    };
}

/**
 * Default naming configuration
 */
export const DEFAULT_NAMING: NamingOptions = {
    tenantPrefix: 't',
    includeProtocol: true,
    includePort: true,
    separator: '_',
    suffixes: {
        virtualServer: '_vs',
        pool: '_pool',
        monitor: '_mon',
        iRule: '_ir',
        snatPool: '_snat',
        clientSsl: '_cssl',
        serverSsl: '_sssl',
        httpProfile: '_httpp',
        tcpProfile: '_tcpp',
        localTrafficPolicy: '_ltp',
        persistence: '_persist',
    },
};

/**
 * Merge user naming options with defaults
 */
export function mergeNamingOptions(options?: NamingOptions): Required<Omit<NamingOptions, 'protocolAbbreviations'>> & { protocolAbbreviations?: Record<string, string> } {
    return {
        tenantPrefix: options?.tenantPrefix ?? DEFAULT_NAMING.tenantPrefix!,
        includeProtocol: options?.includeProtocol ?? DEFAULT_NAMING.includeProtocol!,
        includePort: options?.includePort ?? DEFAULT_NAMING.includePort!,
        separator: options?.separator ?? DEFAULT_NAMING.separator!,
        protocolAbbreviations: options?.protocolAbbreviations,
        suffixes: {
            ...DEFAULT_NAMING.suffixes,
            ...options?.suffixes,
        },
    };
}

// ============================================================================
// Name Generation (AS3_NAMING_CONVENTION_SPEC.md Section 3)
// ============================================================================

/**
 * Generate protocol+port segment for object names.
 * Examples: 'http80', 'ssl443', 'tcp8080', 'tcp' (for wildcard)
 */
export function getProtocolPortSegment(
    protocol: string | undefined,
    port: string | number | undefined,
    options?: NamingOptions
): string {
    const opts = mergeNamingOptions(options);

    if (!opts.includeProtocol) {
        return '';
    }

    const abbrev = getProtocolAbbreviation(protocol, opts.protocolAbbreviations);

    if (!opts.includePort) {
        return abbrev;
    }

    const portNum = parseInt(String(port), 10);

    // Omit port for wildcard (0 or *)
    if (isNaN(portNum) || portNum === 0 || port === '*') {
        return abbrev;
    }

    return `${abbrev}${portNum}`;
}

/**
 * Generate tenant name
 * Pattern: {prefix}_{app_name}
 */
export function generateTenantName(appName: string, options?: NamingOptions): string {
    const opts = mergeNamingOptions(options);
    const sanitized = sanitizeName(appName);
    return `${opts.tenantPrefix}${opts.separator}${sanitized}`;
}

/**
 * Generate application name
 * Pattern: {app_name}_{protocol}{port}
 */
export function generateApplicationName(
    appName: string,
    protocol: string | undefined,
    port: string | number | undefined,
    options?: NamingOptions
): string {
    const opts = mergeNamingOptions(options);
    const sanitized = sanitizeName(appName);
    const protoPort = getProtocolPortSegment(protocol, port, options);

    if (!protoPort) {
        return sanitized;
    }

    return `${sanitized}${opts.separator}${protoPort}`;
}

/**
 * Generate virtual server name
 * Pattern: {app_name}_{protocol}{port}_vs
 */
export function generateVirtualServerName(
    appName: string,
    protocol: string | undefined,
    port: string | number | undefined,
    options?: NamingOptions
): string {
    const opts = mergeNamingOptions(options);
    const baseName = generateApplicationName(appName, protocol, port, options);
    return `${baseName}${opts.suffixes!.virtualServer}`;
}

/**
 * Generate pool name
 * Pattern: {app_name}_{protocol}{port}_pool
 */
export function generatePoolName(
    appName: string,
    protocol: string | undefined,
    port: string | number | undefined,
    options?: NamingOptions
): string {
    const opts = mergeNamingOptions(options);
    const baseName = generateApplicationName(appName, protocol, port, options);
    return `${baseName}${opts.suffixes!.pool}`;
}

/**
 * Generate monitor name
 * Pattern: {app_name}_{mon_type}_mon or {mon_name}_mon
 */
export function generateMonitorName(
    appName: string,
    monitorType: string | undefined,
    monitorName?: string,
    options?: NamingOptions
): string {
    const opts = mergeNamingOptions(options);

    // If custom monitor name provided, use it
    if (monitorName) {
        const sanitized = sanitizeName(monitorName);
        // Only add suffix if it doesn't already end with _mon
        if (sanitized.endsWith('_mon')) {
            return sanitized;
        }
        return `${sanitized}${opts.suffixes!.monitor}`;
    }

    // Generate from app name and monitor type
    const sanitized = sanitizeName(appName);
    const type = getMonitorType(monitorType).toLowerCase();
    return `${sanitized}${opts.separator}${type}${opts.suffixes!.monitor}`;
}

// ============================================================================
// Name Sanitization (AS3_NAMING_CONVENTION_SPEC.md Section 9)
// ============================================================================

/**
 * Sanitize a name for use in AS3 declarations.
 * AS3 object names must be valid JSON property names and DNS-compatible.
 *
 * Rules:
 * 1. Remove surrounding quotes
 * 2. Replace ALL special chars (including hyphens) with underscores
 * 3. Collapse multiple underscores
 * 4. Trim underscores from ends
 * 5. Prefix with 'n' if starts with digit
 * 6. Truncate to 48 characters
 */
export function sanitizeName(name: string): string {
    let result = name
        // Remove surrounding quotes
        .replace(/^["']|["']$/g, '')
        // Replace ALL special chars (including hyphens) with underscores
        .replace(/[^a-zA-Z0-9_]/g, '_')
        // Collapse multiple underscores
        .replace(/_+/g, '_')
        // Trim underscores from ends
        .replace(/^_|_$/g, '');

    // Ensure doesn't start with number (after trimming)
    if (/^[0-9]/.test(result)) {
        result = 'n' + result;
    }

    // Handle empty result
    if (!result) {
        result = 'unnamed';
    }

    // Limit length (leave room for protocol/port/suffix)
    return result.substring(0, 48);
}
