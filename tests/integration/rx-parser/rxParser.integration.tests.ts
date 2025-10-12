/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { AdcApp } from '../../../src/models';
import ADC from '../../../src/CitrixADC';
import { archiveMake } from '../../archiveBuilder';

/**
 * RX Parser Integration Tests
 *
 * These tests validate the RX-based parser output against golden snapshots.
 * Snapshots are generated from known-good parser output and stored in the snapshots/ directory.
 *
 * To update snapshots after intentional parser changes:
 *   npx ts-node tests/integration/rx-parser/generateSnapshots.ts
 */

const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

interface Snapshot {
    configFile: string;
    generatedAt: string;
    apps: AdcApp[];
}

/**
 * Load snapshot file for a given config
 */
function loadSnapshot(configFile: string): Snapshot {
    const snapshotPath = path.join(SNAPSHOTS_DIR, `${configFile}.json`);
    if (!fs.existsSync(snapshotPath)) {
        throw new Error(`Snapshot not found for ${configFile}. Run generateSnapshots.ts to create it.`);
    }
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
}

/**
 * Remove undefined values from objects (matches snapshot generation logic)
 * DISABLED: Commenting out to see where undefined values are coming from
 */
// function removeUndefined(obj: any): any {
//     if (Array.isArray(obj)) {
//         return obj.map(removeUndefined);
//     }
//     if (obj !== null && typeof obj === 'object') {
//         const cleaned: any = {};
//         for (const [key, value] of Object.entries(obj)) {
//             if (value !== undefined) {
//                 cleaned[key] = removeUndefined(value);
//             }
//         }
//         return cleaned;
//     }
//     return obj;
// }

/**
 * Normalize app for comparison by sorting lines array
 * NOT removing undefined values so we can see where they come from
 */
function normalizeApp(app: AdcApp): AdcApp {
    if (!app) return app;
    return {
        ...app,
        lines: app.lines ? [...app.lines].sort() : []
    };
}

/**
 * Compare two apps with detailed error reporting
 */
function compareApps(actualApp: AdcApp | undefined, expectedApp: AdcApp | undefined, appName: string): void {
    if (!expectedApp) {
        throw new Error(`App "${appName}" not found in snapshot`);
    }

    if (!actualApp) {
        throw new Error(`App "${appName}" not found in parser output`);
    }

    // Normalize both apps for comparison
    const normalizedActual = normalizeApp(actualApp);
    const normalizedExpected = normalizeApp(expectedApp);

    try {
        assert.deepStrictEqual(normalizedActual, normalizedExpected);
    } catch (error) {
        console.log(`\n❌ FAILED: ${appName}`);
        console.log('\n--- Differences ---');

        // Show specific field differences
        const allKeys = new Set([...Object.keys(normalizedExpected), ...Object.keys(normalizedActual)]);
        allKeys.forEach(key => {
            const expectedVal = JSON.stringify((normalizedExpected as any)[key]);
            const actualVal = JSON.stringify((normalizedActual as any)[key]);
            if (expectedVal !== actualVal) {
                console.log(`  Field "${key}":`);
                console.log(`    Expected: ${expectedVal.substring(0, 200)}${expectedVal.length > 200 ? '...' : ''}`);
                console.log(`    Actual:   ${actualVal.substring(0, 200)}${actualVal.length > 200 ? '...' : ''}`);
            }
        });

        throw error;
    }
}

/**
 * Test helper that loads config, parses it, and compares against snapshot
 */
async function testConfigAgainstSnapshot(configFile: string, appName: string) {
    // Load the snapshot
    const snapshot = loadSnapshot(configFile);
    const expectedApp = snapshot.apps.find(app => app.name === appName);

    // Parse the config file
    const testFile = await archiveMake(configFile) as string;
    const adc = new ADC();
    await adc.loadParseAsync(testFile);
    const explosion = await adc.explode();
    const apps = explosion?.config.apps || [];
    const actualApp = apps.find(app => app.name === appName);

    // Compare
    compareApps(actualApp, expectedApp, appName);
}

// ========================================
// anyProtocol.ns.conf
// ========================================
describe('RX Parser Integration - anyProtocol.ns.conf', function () {
    it('exchange_any_vs', async function () {
        await testConfigAgainstSnapshot('anyProtocol.ns.conf', 'exchange_any_vs');
    });
});

// ========================================
// apple.ns.conf
// ========================================
describe('RX Parser Integration - apple.ns.conf', function () {
    it('"1 APPLE_443_HTTPS"', async function () {
        await testConfigAgainstSnapshot('apple.ns.conf', '"1 APPLE_443_HTTPS"');
    });

    it('"2 APPLE_80_HTTP"', async function () {
        await testConfigAgainstSnapshot('apple.ns.conf', '"2 APPLE_80_HTTP"');
    });

    it('"3 APPLE_443_HTTPS"', async function () {
        await testConfigAgainstSnapshot('apple.ns.conf', '"3 APPLE_443_HTTPS"');
    });
});

// ========================================
// bren.ns.conf
// ========================================
describe('RX Parser Integration - bren.ns.conf', function () {
    it('nv-app-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-443');
    });

    it('nv-app-cs-8080-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8080-443');
    });

    it('nv-app-cs-8110-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8110-443');
    });

    it('nv-app-cs-8120-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8120-443');
    });

    it('nv-app-cs-8130-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8130-443');
    });

    it('nv-app-cs-8140-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8140-443');
    });

    it('nv-app-cs-8150-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'nv-app-cs-8150-443');
    });

    it('orionprd1123-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'orionprd1123-443');
    });

    it('ormdev-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'ormdev-443');
    });

    it('syslog-splunk-13514-514', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'syslog-splunk-13514-514');
    });

    it('tkb6prd-9402', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'tkb6prd-9402');
    });

    it('vip-sharepoint-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'vip-sharepoint-443');
    });

    it('vip-sharepoint-80', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'vip-sharepoint-80');
    });

    it('vip-sharepoint-default-443', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'vip-sharepoint-default-443');
    });

    it('vip-sharepoint-default-80', async function () {
        await testConfigAgainstSnapshot('bren.ns.conf', 'vip-sharepoint-default-80');
    });
});

// ========================================
// dnsLoadBalancer.ns.conf
// ========================================
describe('RX Parser Integration - dnsLoadBalancer.ns.conf', function () {
    it('dns_lb_vs', async function () {
        await testConfigAgainstSnapshot('dnsLoadBalancer.ns.conf', 'dns_lb_vs');
    });
});

// ========================================
// fn-2187.ns.conf
// ========================================
describe('RX Parser Integration - fn-2187.ns.conf', function () {
    it('fn-2187-vip_http', async function () {
        await testConfigAgainstSnapshot('fn-2187.ns.conf', 'fn-2187-vip_http');
    });
});

// ========================================
// groot.ns.conf
// ========================================
describe('RX Parser Integration - groot.ns.conf', function () {
    it('groot-am-lb-vsvr', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-am-lb-vsvr');
    });

    it('groot-cs-redirect', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-cs-redirect');
    });

    it('groot-cs-vsvr', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-cs-vsvr');
    });

    it('groot-groot-lb-vsvr', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-groot-lb-vsvr');
    });

    it('groot-i-lb-vsvr', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-i-lb-vsvr');
    });

    it('groot-yes-lb-vsvr', async function () {
        await testConfigAgainstSnapshot('groot.ns.conf', 'groot-yes-lb-vsvr');
    });
});

// ========================================
// namaste.conf
// ========================================
describe('RX Parser Integration - namaste.conf', function () {
    it('"namaste 443 vip"', async function () {
        await testConfigAgainstSnapshot('namaste.conf', '"namaste 443 vip"');
    });
});

// ========================================
// skree.ns.conf
// ========================================
describe('RX Parser Integration - skree.ns.conf', function () {
    it('skree1_vip_RDP', async function () {
        await testConfigAgainstSnapshot('skree.ns.conf', 'skree1_vip_RDP');
    });
});

// ========================================
// sslBridge.ns.conf
// ========================================
describe('RX Parser Integration - sslBridge.ns.conf', function () {
    it('app_ssl_bridge_vs', async function () {
        await testConfigAgainstSnapshot('sslBridge.ns.conf', 'app_ssl_bridge_vs');
    });
});

// ========================================
// starlord.ns.conf
// ========================================
describe('RX Parser Integration - starlord.ns.conf', function () {
    it('starlord_cs_vs', async function () {
        await testConfigAgainstSnapshot('starlord.ns.conf', 'starlord_cs_vs');
    });

    it('starlord_http_lb_vs', async function () {
        await testConfigAgainstSnapshot('starlord.ns.conf', 'starlord_http_lb_vs');
    });

    it('starlord_offload_lb_vs', async function () {
        await testConfigAgainstSnapshot('starlord.ns.conf', 'starlord_offload_lb_vs');
    });
});

// ========================================
// t1.ns.conf
// ========================================
describe('RX Parser Integration - t1.ns.conf', function () {
    it('app2_cs_vs', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'app2_cs_vs');
    });

    it('app2_http_vs', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'app2_http_vs');
    });

    it('bottle.gslb.f5flipper.com', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'bottle.gslb.f5flipper.com');
    });

    it('ctx1.gslb.f5flipper.com', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'ctx1.gslb.f5flipper.com');
    });

    it('dorsal.gslb.f5flipper.com', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'dorsal.gslb.f5flipper.com');
    });

    it('echo.gslb.f5flipper.com', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'echo.gslb.f5flipper.com');
    });

    it('https_offload_vs', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'https_offload_vs');
    });

    it('smtp.gslb.f5flipper.com', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'smtp.gslb.f5flipper.com');
    });

    it('stp.gslb.f5flipper.com-http-vs', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'stp.gslb.f5flipper.com-http-vs');
    });

    it('stp.gslb.f5flipper.com-http-vs-failover', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'stp.gslb.f5flipper.com-http-vs-failover');
    });

    it('stp.gslb.f5flipper.com-ssl-vs', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'stp.gslb.f5flipper.com-ssl-vs');
    });

    it('stp.gslb.f5flipper.com-ssl-vs-failover', async function () {
        await testConfigAgainstSnapshot('t1.ns.conf', 'stp.gslb.f5flipper.com-ssl-vs-failover');
    });
});

// ========================================
// tcpLdaps.ns.conf
// ========================================
describe('RX Parser Integration - tcpLdaps.ns.conf', function () {
    it('ldaps_lb_vs', async function () {
        await testConfigAgainstSnapshot('tcpLdaps.ns.conf', 'ldaps_lb_vs');
    });
});

// ========================================
// tcpListenPolicy.ns.conf
// ========================================
describe('RX Parser Integration - tcpListenPolicy.ns.conf', function () {
    it('app_multiport_vs', async function () {
        await testConfigAgainstSnapshot('tcpListenPolicy.ns.conf', 'app_multiport_vs');
    });
});

// ========================================
// udpNtp.ns.conf
// ========================================
describe('RX Parser Integration - udpNtp.ns.conf', function () {
    it('ntp_lb_vs', async function () {
        await testConfigAgainstSnapshot('udpNtp.ns.conf', 'ntp_lb_vs');
    });
});
