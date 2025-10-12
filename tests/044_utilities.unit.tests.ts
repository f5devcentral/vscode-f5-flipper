/**
 * Unit tests for utilities.ts helper functions
 * Tests security functions and type guards
 *
 * Note: getUri() requires VS Code API and cannot be unit tested
 * It will be tested via integration tests or manual testing
 */

'use strict';

import * as assert from 'assert';

// Copy of getNonce from utilities.ts (pure function, no VS Code dependency)
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Copy of isAdcApp from utilities.ts (pure function, no VS Code dependency)
function isAdcApp(obj: any): boolean {
    return !!(obj &&
           typeof obj === 'object' &&
           typeof obj.name === 'string' &&
           typeof obj.type === 'string' &&
           typeof obj.protocol === 'string');
}

describe('Utilities Helper Functions', function () {

    before(async function () {
        // log test file name - makes it easier for troubleshooting
        console.log('----------------------------------------------------------');
        // console.log('---------- file:', __filename);
        
    });

    describe('getNonce()', function () {

        it('should generate a 32-character alphanumeric string', function () {
            const nonce = getNonce();
            assert.strictEqual(nonce.length, 32);
            assert.match(nonce, /^[A-Za-z0-9]{32}$/);
        });

        it('should generate unique nonces on consecutive calls', function () {
            const nonce1 = getNonce();
            const nonce2 = getNonce();
            const nonce3 = getNonce();

            assert.notStrictEqual(nonce1, nonce2);
            assert.notStrictEqual(nonce2, nonce3);
            assert.notStrictEqual(nonce1, nonce3);
        });

        it('should only contain valid characters (A-Z, a-z, 0-9)', function () {
            const nonce = getNonce();
            const validChars = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+$/;
            assert.match(nonce, validChars);
        });

        it('should generate statistically unique nonces (100 iterations)', function () {
            const nonces = new Set<string>();
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                nonces.add(getNonce());
            }

            // All nonces should be unique
            assert.strictEqual(nonces.size, iterations);
        });
    });

    describe('isAdcApp() type guard', function () {

        it('should return true for valid AdcApp object', function () {
            const validApp = {
                name: 'test-app',
                type: 'lb',
                protocol: 'HTTP',
                ipAddress: '192.168.1.100',
                port: 80
            };

            assert.strictEqual(isAdcApp(validApp), true);
        });

        it('should return true for minimal valid AdcApp (name, type, protocol only)', function () {
            const minimalApp = {
                name: 'minimal-app',
                type: 'cs',
                protocol: 'HTTPS'
            };

            assert.strictEqual(isAdcApp(minimalApp), true);
        });

        it('should return false for null', function () {
            assert.strictEqual(isAdcApp(null), false);
        });

        it('should return false for undefined', function () {
            assert.strictEqual(isAdcApp(undefined), false);
        });

        it('should return false for non-object primitive types', function () {
            assert.strictEqual(isAdcApp('string'), false);
            assert.strictEqual(isAdcApp(123), false);
            assert.strictEqual(isAdcApp(true), false);
        });

        it('should return false for empty object', function () {
            assert.strictEqual(isAdcApp({}), false);
        });

        it('should return false when missing name property', function () {
            const noName = {
                type: 'lb',
                protocol: 'HTTP'
            };
            assert.strictEqual(isAdcApp(noName), false);
        });

        it('should return false when missing type property', function () {
            const noType = {
                name: 'test-app',
                protocol: 'HTTP'
            };
            assert.strictEqual(isAdcApp(noType), false);
        });

        it('should return false when missing protocol property', function () {
            const noProtocol = {
                name: 'test-app',
                type: 'lb'
            };
            assert.strictEqual(isAdcApp(noProtocol), false);
        });

        it('should return false when name is not a string', function () {
            const invalidName = {
                name: 123,
                type: 'lb',
                protocol: 'HTTP'
            };
            assert.strictEqual(isAdcApp(invalidName), false);
        });

        it('should return false when type is not a string', function () {
            const invalidType = {
                name: 'test-app',
                type: 123,
                protocol: 'HTTP'
            };
            assert.strictEqual(isAdcApp(invalidType), false);
        });

        it('should return false when protocol is not a string', function () {
            const invalidProtocol = {
                name: 'test-app',
                type: 'lb',
                protocol: 123
            };
            assert.strictEqual(isAdcApp(invalidProtocol), false);
        });

        it('should return true for AdcApp with additional properties', function () {
            const extendedApp = {
                name: 'extended-app',
                type: 'lb',
                protocol: 'SSL',
                ipAddress: '10.1.1.100',
                port: 443,
                persistence: 'SOURCE_IP',
                monitors: ['http', 'tcp'],
                extra: 'ignored'
            };

            assert.strictEqual(isAdcApp(extendedApp), true);
        });

        it('should return false for array', function () {
            const arr = ['name', 'type', 'protocol'];
            assert.strictEqual(isAdcApp(arr), false);
        });

        it('should handle GSLB app type', function () {
            const gslbApp = {
                name: 'gslb-app',
                type: 'gslb',
                protocol: 'HTTP'
            };

            assert.strictEqual(isAdcApp(gslbApp), true);
        });

        it('should handle CS (Content Switching) app type', function () {
            const csApp = {
                name: 'cs-app',
                type: 'cs',
                protocol: 'SSL_BRIDGE'
            };

            assert.strictEqual(isAdcApp(csApp), true);
        });

        it('should handle empty strings (technically valid per type guard)', function () {
            const emptyStrings = {
                name: '',
                type: '',
                protocol: ''
            };

            // Type guard only checks typeof === 'string', not emptiness
            assert.strictEqual(isAdcApp(emptyStrings), true);
        });
    });
});