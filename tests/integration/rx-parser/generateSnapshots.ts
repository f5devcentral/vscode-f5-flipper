/*
 * Script to generate golden/snapshot files from current RX parser output
 * Run this to update snapshots when making intentional changes to parser behavior
 */

import * as fs from 'fs';
import * as path from 'path';
import ADC from '../../../src/CitrixADC';
import { archiveMake } from '../../archiveBuilder';

const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// List of all config files to generate snapshots for
const CONFIG_FILES = [
    'anyProtocol.ns.conf',
    'apple.ns.conf',
    'bren.ns.conf',
    'dnsLoadBalancer.ns.conf',
    'fn-2187.ns.conf',
    'groot.ns.conf',
    'namaste.conf',
    'skree.ns.conf',
    'sslBridge.ns.conf',
    'starlord.ns.conf',
    't1.ns.conf',
    'tcpLdaps.ns.conf',
    'tcpListenPolicy.ns.conf',
    'udpNtp.ns.conf'
];

async function generateSnapshots() {
    console.log('Generating RX parser snapshots...\n');

    // Ensure snapshots directory exists
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }

    for (const configFile of CONFIG_FILES) {
        console.log(`Processing ${configFile}...`);

        try {
            // Load and parse the config file
            const testFile = await archiveMake(configFile) as string;
            const adc = new ADC();
            await adc.loadParseAsync(testFile);
            const explosion = await adc.explode();
            const apps = explosion?.config.apps || [];

            // Helper to remove undefined values from objects
            // DISABLED: Commenting out to see where undefined values are coming from
            // const removeUndefined = (obj: any): any => {
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
            // };

            // Save each app as a separate JSON file
            // Or save all apps for this config in one file
            const snapshotData = {
                configFile,
                generatedAt: new Date().toISOString(),
                apps: apps.map(app => ({
                    ...app,
                    // Sort lines array for consistent comparison
                    lines: app.lines ? [...app.lines].sort() : []
                }))
            };

            const snapshotPath = path.join(SNAPSHOTS_DIR, `${configFile}.json`);
            fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2));

            console.log(`  ✓ Generated snapshot with ${apps.length} apps`);
        } catch (error) {
            console.error(`  ✗ Error processing ${configFile}:`, error);
        }
    }

    console.log('\n✓ Snapshot generation complete!');
}

// Run if executed directly
if (require.main === module) {
    generateSnapshots().catch(console.error);
}

export { generateSnapshots };
