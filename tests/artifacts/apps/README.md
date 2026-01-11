# NetScaler Test Configurations

Test configs for validating F5 Flipper parsing. Configs are either **verified** (deployed and extracted from real NetScaler) or **synthetic** (valid syntax but not deployed due to feature/licensing constraints).

## Target Device

| Property | Value |
|----------|-------|
| Host | 52.180.146.197 |
| Version | NS13.1 Build 61.23.nc |
| License | Platinum |
| Hardware | Remote Licensed Virtual Appliance |

## Test Workflow

1. Clear existing config via MCP `clear_config`
2. Deploy test config via MCP `deploy_config`
3. Extract running config via MCP `get_running_config`
4. Save extracted config to `extracted/` folder
5. Clear config before next test

---

## Config Status

### P1 - Object Type Expansion (Verified on Real NetScaler)

| Config | Section | Status | Notes |
|--------|---------|--------|-------|
| networkObjects.ns.conf | 1.1 | ✅ **Verified** | VLAN, trafficDomain (netProfile not supported on VPX) |
| profiles.ns.conf | 1.2 | ✅ **Verified** | TCP, HTTP, SSL, DNS profiles |
| persistence.ns.conf | 1.3 | ✅ **Verified** | 5 persistence types: SOURCEIP, COOKIEINSERT, SSLSESSION, URLPASSIVE, CUSTOMSERVERID |
| caching.ns.conf | 1.4 | ✅ **Verified** | Cache contentGroup, selector, policy (requires `enable ns feature IC`) |
| compression.ns.conf | 1.5 | ✅ **Verified** | CMP policies (bind globally, not to vservers) |
| authorization.ns.conf | 1.6 | ✅ **Verified** | Authorization policies (POSITIONAL syntax - see findings) |
| rateLimiting.ns.conf | 1.7 | ✅ **Verified** | stream selector (deprecated ns limitSelector), ns limitIdentifier |
| auditLogging.ns.conf | 1.8 | ✅ **Verified** | Syslog/NSLog config (POSITIONAL syntax, `true` not `HTTP.REQ.IS_VALID`) |
| spillover.ns.conf | 1.9 | ✅ **Verified** | Spillover with backup vserver (use `set -soMethod`, not `add -spilloverMethod`) |
| aaaLegacy.ns.conf | 1.10 | ✅ **Verified** | AAA vservers, LDAP/RADIUS auth (classic policies deprecated, -authenticationHost required) |

### P2 - Feature Detection (Synthetic - Not Deployed)

| Config | Section | Status | Reason |
|--------|---------|--------|--------|
| gslbComplete.ns.conf | 2.1 | ⚠️ **Synthetic** | GSLB requires multi-site deployment with site passwords |
| appFirewall.ns.conf | 2.2 | ⚠️ **Synthetic** | AppFW feature not enabled on test appliance |
| customMonitors.ns.conf | 2.3 | ⚠️ **Synthetic** | USER type monitors require dispatcher scripts |
| diagnosticsTriggers.ns.conf | 4.1 | ⚠️ **Synthetic** | Combines features for diagnostic rule testing |
| productionWeb.ns.conf | 5.1 | ⚠️ **Synthetic** | Comprehensive integration test config |
| specialCharacters.ns.conf | 6.1 | ⚠️ **Synthetic** | Parser edge cases and quoting tests |

### P3 - Infrastructure Features (Synthetic - Not Deployable)

| Config | Section | Status | Reason |
|--------|---------|--------|--------|
| haCluster.ns.conf | 2.4 | ⚠️ **Synthetic** | HA/Cluster requires multiple physical/virtual nodes |
| nFactorAuth.ns.conf | 3.1 | ⚠️ **Synthetic** | nFactor auth requires AAA feature and IdP integration |
| samlAuth.ns.conf | 3.2 | ⚠️ **Synthetic** | SAML requires external IdP for full testing |
| oauthAuth.ns.conf | 3.3 | ⚠️ **Synthetic** | OAuth requires external provider for full testing |

---

## Synthetic Config Notes

**Synthetic configs** contain valid NetScaler CLI syntax based on official documentation and are suitable for:

- Parser validation testing
- Feature detection testing
- Conversion logic testing

**Limitations of synthetic configs:**

- May have minor syntax variations from real deployed configs
- Default values may differ from actual NetScaler behavior
- Some command options may not be available on all NetScaler versions/licenses

**To verify synthetic configs:**

1. Enable required feature (`enable ns feature <feature>`)
2. Deploy via MCP `deploy_config`
3. Fix any syntax errors reported
4. Extract and save to `extracted/` folder

---

## Key Findings

1. **ns netProfile** - Not supported on Azure VPX (physical appliance feature)
2. **ns limitSelector** - Deprecated, use `stream selector` instead
3. **cmp policies** - Bind globally (`bind cmp global`), not to vservers
4. **cache selectors** - Syntax: `add cache selector <name> <expr>` (no -rule flag)
5. **Persistence timeout** - Max 1440 minutes (24 hours)
6. **Authorization policy** - Uses POSITIONAL args: `add authorization policy <name> <rule> <action>`, NOT `-rule`/`-action` flags
7. **Audit syslogPolicy** - Uses POSITIONAL args: `add audit syslogPolicy <name> <rule> <action>`
8. **Spillover config** - Use `set lb vserver -soMethod CONNECTION -soThreshold 100`, not `add ... -spilloverMethod`
9. **HTTP.REQ.IS_VALID** - Not a valid expression; use `true` for always-match policies
10. **Classic auth policies** - `add authentication ldapPolicy`/`radiusPolicy` are deprecated; use `add authentication policy` (advanced)
11. **-authenticationHost required** - When using `-Authentication ON` on lb vserver, `-authenticationHost` is mandatory
12. **Passwords in running config** - LDAP bindDnPassword and RADIUS radKey are encrypted in running config output
