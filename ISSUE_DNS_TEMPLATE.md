# GitHub Issue: Missing DNS AS3 Template

**Issue Title:** `[BUG] Missing DNS AS3 template for DNS load balancer applications`

**Labels:** `bug`, `enhancement`, `templates`

---

## Describe the bug

When attempting to open/convert a DNS load balancer application using the FAST template webview, the extension throws an error because there is no `as3/DNS.yaml` template file.

## Error Message

```
Error: could not find a template with name "as3/DNS"
    at FsTemplateProvider._loadTemplate (/home/ted/vscode-f5-flipper/node_modules/@f5devcentral/f5-fast-core/lib/template_provider.js:254:35)
    at ResourceCache.asyncFetch (/home/ted/vscode-f5-flipper/node_modules/@f5devcentral/f5-fast-core/lib/template_provider.js:57:58)
    at /home/ted/vscode-f5-flipper/node_modules/@f5devcentral/f5-fast-core/lib/resource_cache.js:29:41
    at ResourceCache.fetch (/home/ted/vscode-f5-flipper/node_modules/@f5devcentral/f5-fast-core/lib/resource_cache.js:21:25)
    ...
```

## To Reproduce

Steps to reproduce the behavior:
1. Load a NetScaler config with DNS load balancer applications (see `tests/artifacts/apps/dnsLoadBalancer.ns.conf`)
2. Click "Explore ADC/NS (.conf/tgz)"
3. Expand the "Apps" section in the Citrix ADC/NS Config Explorer
4. Click on a DNS application (e.g., `dns_lb_vs`)
5. Click the "View NS App JSON" button or attempt to render FAST template
6. See error in output panel

## Expected behavior

The extension should:
1. Load a DNS-specific AS3 template (`templates/as3/DNS.yaml`)
2. Display the template form with DNS-specific parameters
3. Allow conversion of DNS applications to AS3 format

## Current State

### Existing Templates
The following templates exist in `templates/as3/`:
- ✅ ANY.yaml
- ✅ ANY STAR.yaml
- ✅ FTP.yaml
- ✅ HTTP.yaml
- ✅ HTTP-TCP.yaml
- ✅ RDP.yaml
- ✅ SSL.yaml
- ✅ SSL_BRIDGE.yaml
- ✅ SSL_TCP.yaml
- ✅ TCP.yaml
- ✅ TFTP.yaml
- ✅ UDP.yaml
- ❌ DNS.yaml (MISSING)

### DNS Protocol Support
DNS is a valid NetScaler protocol type:
- DNS load balancer parsing works correctly ✅
- DNS application abstraction works correctly ✅
- DNS test coverage exists (see `tests/036_dnsLoadBalancer.unit.tests.ts`) ✅
- DNS FAST template is missing ❌

## Implementation Requirements

Create a new `templates/as3/DNS.yaml` file with:

### DNS-Specific Features to Support
1. **Virtual Server Configuration**
   - DNS protocol on port 53 (UDP/TCP)
   - Typical persistence: NONE (DNS is stateless)
   - DNS-specific timeout settings

2. **Pool/Service Group Configuration**
   - DNS service groups
   - DNS server backends on port 53
   - Health monitoring with DNS queries

3. **DNS Health Monitoring**
   - DNS monitor type
   - DNS query validation
   - Query types: Address, NS, MX, etc.
   - Destination port configuration

4. **DNS-Specific Options**
   - DNS caching settings (if applicable)
   - DNS query/response handling
   - Recursion settings
   - DNSSEC support considerations

### Template Structure Reference

Based on existing templates (UDP.yaml, TCP.yaml), the DNS template should include:

```yaml
title: NetScaler DNS Load Balancer to AS3
description: Convert NetScaler DNS load balancer configuration to F5 AS3 format
definitions:
  virtual_name:
    title: Virtual Server Name
    type: string
    propertyOrder: 1
  virtual_address:
    title: Virtual IP Address
    type: string
    propertyOrder: 2
  virtual_port:
    title: Virtual Port
    type: integer
    default: 53
    propertyOrder: 3
  # DNS-specific parameters
  pool_members:
    title: DNS Server Pool Members
    type: array
    propertyOrder: 10
  monitor_type:
    title: Health Monitor Type
    type: string
    default: dns
    propertyOrder: 20
  dns_query_name:
    title: DNS Query Name
    type: string
    default: "."
    propertyOrder: 21
  dns_query_type:
    title: DNS Query Type
    type: string
    enum: [A, AAAA, NS, MX, PTR, SOA, TXT]
    default: A
    propertyOrder: 22
template: |
  {
    "class": "AS3",
    "action": "deploy",
    "declaration": {
      "class": "ADC",
      "schemaVersion": "3.0.0",
      "{{tenant_name}}": {
        "class": "Tenant",
        "{{app_name}}": {
          "class": "Application",
          "{{virtual_name}}": {
            "class": "Service_UDP",
            "virtualAddresses": ["{{virtual_address}}"],
            "virtualPort": {{virtual_port}},
            "pool": "{{pool_name}}"
          },
          "{{pool_name}}": {
            "class": "Pool",
            "monitors": ["{{monitor_name}}"],
            "members": [
              {{#pool_members}}
              {
                "servicePort": 53,
                "serverAddresses": ["{{address}}"]
              }{{^last}},{{/last}}
              {{/pool_members}}
            ]
          },
          "{{monitor_name}}": {
            "class": "Monitor",
            "monitorType": "dns",
            "queryName": "{{dns_query_name}}",
            "queryType": "{{dns_query_type}}"
          }
        }
      }
    }
  }
```

## Test Case Reference

See `tests/artifacts/apps/dnsLoadBalancer.ns.conf` for a complete DNS load balancer configuration example that should work with the new template.

### Sample NetScaler DNS Config
```
add lb vserver dns_lb_vs DNS 192.168.1.10 53 -persistenceType NONE -cltTimeout 120
add serviceGroup dns_east_sg DNS -maxClient 0 -maxReq 0 -cip DISABLED -usip NO -useproxyport NO
add server dns_east_primary 10.1.1.25 -comment "Primary DNS East Coast"
bind serviceGroup dns_east_sg dns_east_primary 53 -weight 100
add lb monitor dns_health_mon DNS -query . -queryType Address -LRTM DISABLED -destPort 53
bind serviceGroup dns_east_sg -monitorName dns_health_mon
bind lb vserver dns_lb_vs dns_east_sg
```

## Additional Context

- **Priority**: Medium - DNS is a commonly used NetScaler protocol
- **Version Affected**: All versions (v1.16.0 and earlier)
- **Workaround**: None currently - DNS apps cannot be converted to AS3
- **Related**: Should follow the pattern of existing templates (UDP.yaml, TCP.yaml)
- **AS3 Documentation**: [F5 AS3 Service_UDP Class](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/refguide/schema-reference.html#service-udp)
- **NetScaler DNS Docs**: [NetScaler DNS Load Balancing](https://docs.netscaler.com/en-us/citrix-adc/current-release/dns.html)

## Acceptance Criteria

- [ ] Create `templates/as3/DNS.yaml` file
- [ ] Template successfully loads for DNS applications
- [ ] Template parameters align with DNS-specific features
- [ ] Template renders valid AS3 JSON for DNS load balancers
- [ ] Test with `dnsLoadBalancer.ns.conf` fixture
- [ ] Update template test coverage (if applicable)
- [ ] Verify AS3 output deploys successfully to F5 BIG-IP (optional validation)

---

**Suggested Implementation Files:**
- `templates/as3/DNS.yaml` (new)
- Documentation update in CHANGELOG.md

**Related Test Files:**
- `tests/036_dnsLoadBalancer.unit.tests.ts` (for validation)
- `tests/artifacts/apps/dnsLoadBalancer.ns.conf` (test fixture)
