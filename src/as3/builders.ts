/**
 * AS3 Declaration Builders
 *
 * Functions to build AS3 JSON structures from AdcApp objects.
 * Replaces the old mungeNS2FAST + YAML template approach.
 *
 * Naming Convention: See specs/AS3_NAMING_CONVENTION_SPEC.md
 * Pattern: {app_name}_{protocol}{port}_{suffix}
 *
 * @module as3/builders
 */

import { AdcApp } from '../models';
import {
    getLbMethod,
    getPersistence,
    getServiceClass,
    getMonitorType,
    getSnat,
    sanitizeName,
    NamingOptions,
    generateTenantName,
    generateApplicationName,
    generateVirtualServerName,
    generatePoolName,
    generateMonitorName,
} from './mappings';

// ============================================================================
// Types
// ============================================================================

export interface AS3Declaration {
    class: 'AS3';
    action?: 'deploy' | 'dry-run' | 'patch' | 'redeploy' | 'retrieve' | 'remove';
    persist?: boolean;
    declaration: AS3ADC;
}

export interface AS3ADC {
    class: 'ADC';
    schemaVersion: string;
    id?: string;
    label?: string;
    remark?: string;
    [tenantName: string]: any;
}

export interface BuildOptions {
    schemaVersion?: string;
    includeMetadata?: boolean;
    namingOptions?: NamingOptions;
    /** @deprecated Use namingOptions.tenantPrefix instead */
    tenantPrefix?: string;
}

const DEFAULT_OPTIONS: BuildOptions = {
    schemaVersion: '3.50.0',
    includeMetadata: true,
};

// ============================================================================
// Main Declaration Builder
// ============================================================================

/**
 * Build a complete AS3 declaration from an AdcApp
 *
 * @example
 * ```typescript
 * const result = buildDeclaration(app);
 * // Output structure:
 * // t_web_app (tenant)
 * //   web_app_http80 (application)
 * //     web_app_http80_vs (virtual server)
 * //     web_app_http80_pool (pool)
 * //     web_app_http_mon (monitor)
 * ```
 */
export function buildDeclaration(app: AdcApp, options: BuildOptions = {}): AS3Declaration {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Support legacy tenantPrefix option
    const namingOpts: NamingOptions = {
        ...opts.namingOptions,
        ...(opts.tenantPrefix && { tenantPrefix: opts.tenantPrefix }),
    };

    const tenantName = generateTenantName(app.name, namingOpts);
    const appName = generateApplicationName(app.name, app.protocol, app.port, namingOpts);

    const adc: AS3ADC = {
        class: 'ADC',
        schemaVersion: opts.schemaVersion!,
        id: `flipper-${Date.now()}`,
        [tenantName]: {
            class: 'Tenant',
            [appName]: buildApplication(app, namingOpts),
        },
    };

    if (opts.includeMetadata) {
        adc.label = 'Converted from NetScaler by Flipper';
        adc.remark = `Source: ${app.name} (${app.type})`;
    }

    return {
        class: 'AS3',
        action: 'deploy',
        persist: true,
        declaration: adc,
    };
}

// ============================================================================
// Application Builder
// ============================================================================

/**
 * Build an AS3 Application object
 */
function buildApplication(app: AdcApp, namingOpts?: NamingOptions): Record<string, any> {
    const vsName = generateVirtualServerName(app.name, app.protocol, app.port, namingOpts);
    const poolName = generatePoolName(app.name, app.protocol, app.port, namingOpts);
    const serviceClass = getServiceClass(app.protocol);

    const result: Record<string, any> = {
        class: 'Application',
        [vsName]: buildService(app, namingOpts),
    };

    // Add pool if we have members
    const hasMembers = hasPoolMembers(app);
    if (hasMembers) {
        result[poolName] = buildPool(app, namingOpts);
    }

    // Add monitors
    const monitors = collectMonitors(app);
    for (const mon of monitors) {
        const monName = generateMonitorName(app.name, mon.type, mon.name, namingOpts);
        result[monName] = buildMonitor(mon);
    }

    // Add TLS_Server and Certificate for HTTPS services
    if (serviceClass === 'Service_HTTPS') {
        const tlsServerName = `${sanitizeName(app.name)}_tls`;
        const certName = `${sanitizeName(app.name)}_cert`;
        result[tlsServerName] = buildTlsServer(certName);
        result[certName] = buildCertificate();
    }

    return result;
}

// ============================================================================
// Service Builder
// ============================================================================

/**
 * Build an AS3 Service object (virtual server)
 */
function buildService(app: AdcApp, namingOpts?: NamingOptions): Record<string, any> {
    const serviceClass = getServiceClass(app.protocol);
    const poolName = generatePoolName(app.name, app.protocol, app.port, namingOpts);
    const hasMembers = hasPoolMembers(app);

    const service: Record<string, any> = {
        class: serviceClass,
        virtualAddresses: [app.ipAddress || '0.0.0.0'],
        virtualPort: parsePort(app.port),
    };

    // Pool reference
    if (hasMembers) {
        service.pool = poolName;
    }

    // LB Method (on service for AS3)
    const lbMethod = app.opts?.['-lbMethod'] as string | undefined;
    if (lbMethod) {
        service.loadBalancingMode = getLbMethod(lbMethod);
    }

    // Persistence
    const persistenceType = app.opts?.['-persistenceType'] as string | undefined;
    const persistence = getPersistence(persistenceType);
    if (persistence) {
        service.persistenceMethods = [persistence];
    }

    // Timeouts
    const cltTimeout = app.opts?.['-cltTimeout'];
    if (cltTimeout) {
        service.idleTimeout = parseInt(String(cltTimeout), 10);
    }

    // SNAT
    const snat = getSnat(app);
    if (snat !== 'none') {
        service.snat = snat;
    }

    // SSL/TLS for HTTPS services
    // serverTLS references a named TLS_Server object in the Application
    if (serviceClass === 'Service_HTTPS') {
        const tlsServerName = `${sanitizeName(app.name)}_tls`;
        service.serverTLS = tlsServerName;
    }

    // HTTP Profile reference
    const httpProfile = app.opts?.['-httpProfileName'] as string | undefined;
    if (httpProfile && (serviceClass === 'Service_HTTP' || serviceClass === 'Service_HTTPS')) {
        // Could reference a custom profile or use defaults
        // For now, we'll note it but AS3 handles defaults well
    }

    // TCP Profile reference
    const tcpProfile = app.opts?.['-tcpProfileName'] as string | undefined;
    if (tcpProfile) {
        // Similar - could add profileTCP reference
    }

    return service;
}

// ============================================================================
// TLS Builder
// ============================================================================

/**
 * Build a TLS_Server object for client-facing SSL termination
 * References a Certificate class object by name
 */
function buildTlsServer(certName: string): Record<string, any> {
    return {
        class: 'TLS_Server',
        certificates: [{
            certificate: certName
        }]
    };
}

/**
 * Build a Certificate class object that references the default BIG-IP cert
 * Customer certs should be uploaded separately and declaration updated
 */
function buildCertificate(): Record<string, any> {
    // Reference default.crt which exists on all BIG-IPs
    return {
        class: 'Certificate',
        certificate: { bigip: '/Common/default.crt' }
    };
}

// ============================================================================
// Pool Builder
// ============================================================================

/**
 * Build an AS3 Pool object
 */
function buildPool(app: AdcApp, namingOpts?: NamingOptions): Record<string, any> {
    const pool: Record<string, any> = {
        class: 'Pool',
        members: buildPoolMembers(app),
    };

    // LB Method
    const lbMethod = app.opts?.['-lbMethod'] as string | undefined;
    if (lbMethod) {
        pool.loadBalancingMode = getLbMethod(lbMethod);
    }

    // Monitor references (deduplicated)
    const monitors = collectMonitors(app);
    if (monitors.length > 0) {
        const monitorRefs = monitors.map(m => ({
            use: generateMonitorName(app.name, m.type, m.name, namingOpts)
        }));
        // Dedupe by monitor name to avoid "duplicate values in monitors" error
        const seen = new Set<string>();
        pool.monitors = monitorRefs.filter(ref => {
            if (seen.has(ref.use)) return false;
            seen.add(ref.use);
            return true;
        });
    }

    return pool;
}

/**
 * Build pool members array from app bindings
 */
function buildPoolMembers(app: AdcApp): Record<string, any>[] {
    const members: Record<string, any>[] = [];

    // From service bindings
    if (app.bindings?.service) {
        for (const svc of app.bindings.service) {
            const member = buildMemberFromService(svc, app);
            if (member) members.push(member);
        }
    }

    // From serviceGroup bindings
    if (app.bindings?.serviceGroup) {
        for (const sg of app.bindings.serviceGroup) {
            if (sg.servers) {
                for (const server of sg.servers) {
                    const member = buildMemberFromService(server, app);
                    if (member) members.push(member);
                }
            }
        }
    }

    return members;
}

/**
 * Build a single pool member from a service object
 */
function buildMemberFromService(
    svc: { address?: string; hostname?: string; port?: string; name?: string; opts?: Record<string, any> },
    app: AdcApp
): Record<string, any> | null {
    // Determine if FQDN or IP member
    if (svc.hostname) {
        // FQDN member
        return {
            addressDiscovery: 'fqdn',
            hostname: svc.hostname,
            servicePort: parsePort(svc.port) || parsePort(app.port),
            ...(isDisabled(svc) && { enable: false }),
        };
    } else if (svc.address) {
        // IP member
        return {
            serverAddresses: [svc.address],
            servicePort: parsePort(svc.port) || parsePort(app.port),
            ...(isDisabled(svc) && { enable: false }),
        };
    }

    return null;
}

// ============================================================================
// Monitor Builder
// ============================================================================

interface MonitorInfo {
    name: string;
    type?: string;
    interval?: number;
    timeout?: number;
    send?: string;
    recv?: string;
    [key: string]: any;
}

/**
 * Build an AS3 Monitor object
 */
function buildMonitor(mon: MonitorInfo): Record<string, any> {
    const monitorType = getMonitorType(mon.type);

    const monitor: Record<string, any> = {
        class: 'Monitor',
        monitorType,
    };

    // Interval
    if (mon.interval) {
        monitor.interval = mon.interval;
    }

    // Timeout
    if (mon.timeout) {
        monitor.timeout = mon.timeout;
    }

    // Send string
    if (mon.send) {
        monitor.send = mon.send;
    }

    // Receive string
    if (mon.recv) {
        monitor.receive = mon.recv;
    }

    // HTTP-specific
    if (monitorType === 'http' || monitorType === 'https') {
        if (mon['-httpRequest']) {
            monitor.send = mon['-httpRequest'];
        }
        if (mon['-respCode']) {
            // AS3 uses receive for response validation
            monitor.receive = `HTTP/1.1 ${mon['-respCode']}`;
        }
    }

    return monitor;
}

/**
 * Collect all monitors from app bindings
 */
function collectMonitors(app: AdcApp): MonitorInfo[] {
    const monitors: MonitorInfo[] = [];

    // From serviceGroup bindings
    if (app.bindings?.serviceGroup) {
        for (const sg of app.bindings.serviceGroup) {
            if (sg.monitors) {
                for (const mon of sg.monitors) {
                    if (typeof mon === 'object' && mon.name) {
                        monitors.push(mon);
                    } else if (typeof mon === 'string') {
                        monitors.push({ name: mon, type: 'tcp' });
                    }
                }
            }
        }
    }

    // Default to basic monitor if none found but we have pool members
    if (monitors.length === 0 && hasPoolMembers(app)) {
        // Determine default monitor type based on protocol
        const defaultType = getDefaultMonitorType(app.protocol);
        monitors.push({
            name: `${app.name}_default`,
            type: defaultType,
        });
    }

    return monitors;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if app has pool members
 */
function hasPoolMembers(app: AdcApp): boolean {
    if (app.bindings?.service && app.bindings.service.length > 0) {
        return true;
    }
    if (app.bindings?.serviceGroup) {
        for (const sg of app.bindings.serviceGroup) {
            if (sg.servers && sg.servers.length > 0) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Parse port to number, handling wildcards
 */
function parsePort(port: string | number | undefined): number {
    if (port === undefined || port === null) return 80;
    if (port === '*' || port === '0') return 0;
    const parsed = parseInt(String(port), 10);
    return isNaN(parsed) ? 80 : parsed;
}

/**
 * Check if a service/member is disabled
 */
function isDisabled(svc: { opts?: Record<string, any>; [key: string]: any }): boolean {
    const state = svc['-state'] || svc.opts?.['-state'];
    return state === 'DISABLED' || state === 'MAINTENANCE';
}

/**
 * Get default monitor type based on protocol
 */
function getDefaultMonitorType(protocol: string | undefined): string {
    if (!protocol) return 'tcp';

    const defaults: Record<string, string> = {
        'HTTP': 'HTTP',
        'SSL': 'HTTPS',
        'TCP': 'TCP',
        'UDP': 'UDP',
        'DNS': 'DNS',
        'FTP': 'FTP',
        'RADIUS': 'RADIUS',
    };

    return defaults[protocol.toUpperCase()] || 'TCP';
}
