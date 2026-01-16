# Local Traffic Policy Conversion Specification

**Date**: 2026-01-15
**Status**: FUTURE / NOT STARTED
**Author**: Claude Code + Ted
**Priority**: Medium-High

---

## Overview

This specification defines the approach for converting NetScaler policies (responder, rewrite, content switching expressions) to F5 BIG-IP Local Traffic Policies (LTP) via AS3 `Endpoint_Policy` declarations.

---

## Current State

The AS3 conversion engine **does not** currently support Local Traffic Policies. The following NS policy types are detected but not converted:

| NS Policy Type | Detection | Conversion |
|----------------|-----------|------------|
| Responder policies | ✅ Parsed | ❌ Not converted |
| Rewrite policies | ✅ Parsed | ❌ Not converted |
| CS expressions | ✅ Parsed | ❌ Not converted |
| AppFW policies | ✅ Parsed | ❌ Not converted |
| Cache policies | ✅ Parsed | ❌ Not converted |

When policies are detected, they should generate alerts in the bulk export report indicating manual conversion is required.

---

## NetScaler Policy Types

### Responder Policies

**Purpose**: Return HTTP responses, redirects, or drop connections based on conditions.

**NS Syntax**:
```
add responder action act_redirect redirect "\"https://\" + HTTP.REQ.HOSTNAME + HTTP.REQ.URL"
add responder policy pol_http_to_https "HTTP.REQ.IS_VALID && !CLIENT.SSL.IS_SSL" act_redirect
bind lb vserver vs_web -policyName pol_http_to_https -priority 100
```

**Actions**:
- `respondwith` - Return custom HTTP response
- `redirect` - HTTP redirect (301, 302, etc.)
- `drop` - Drop connection
- `reset` - Reset connection
- `noop` - No operation (logging only)

### Rewrite Policies

**Purpose**: Modify HTTP requests/responses (headers, URLs, body).

**NS Syntax**:
```
add rewrite action act_add_header insert_http_header "X-Forwarded-Proto" "\"https\""
add rewrite policy pol_add_header true act_add_header
bind lb vserver vs_web -policyName pol_add_header -priority 100 -type REQUEST
```

**Actions**:
- `insert_http_header` - Add header
- `delete_http_header` - Remove header
- `replace` - Replace content
- `replace_http_res` - Replace response body
- `clientless_vpn_encode` / `decode` - URL encoding

### Content Switching Expressions

**Purpose**: Route requests to different pools based on conditions.

**NS Syntax**:
```
add cs policy pol_api -rule "HTTP.REQ.URL.PATH.STARTSWITH(\"/api\")"
bind cs vserver cs_main -policyName pol_api -targetLBVserver lb_api -priority 100
```

---

## F5 Local Traffic Policy (AS3)

### AS3 Endpoint_Policy Class

```json
{
  "class": "Endpoint_Policy",
  "rules": [
    {
      "name": "rule_redirect_http",
      "conditions": [
        {
          "type": "httpUri",
          "path": {
            "operand": "starts-with",
            "values": ["/api"]
          }
        }
      ],
      "actions": [
        {
          "type": "httpRedirect",
          "location": "https://example.com"
        }
      ]
    }
  ],
  "strategy": "first-match"
}
```

### Supported Condition Types

| AS3 Condition | Description |
|---------------|-------------|
| `httpUri` | Match URI path, query, etc. |
| `httpHeader` | Match HTTP header values |
| `httpHost` | Match Host header |
| `httpMethod` | Match HTTP method (GET, POST, etc.) |
| `httpCookie` | Match cookie values |
| `tcp` | Match TCP properties (port, etc.) |
| `sslExtension` | Match SSL/TLS properties |

### Supported Action Types

| AS3 Action | Description |
|------------|-------------|
| `httpRedirect` | Redirect to URL |
| `forward` | Forward to pool |
| `httpHeader` | Insert/remove/replace headers |
| `drop` | Drop connection |
| `waf` | Apply WAF policy |
| `persist` | Set persistence |

---

## Mapping Strategy

### Phase 1: Simple Mappings (High Confidence)

These NS constructs map directly to LTP equivalents:

| NS Expression | LTP Condition |
|---------------|---------------|
| `HTTP.REQ.URL.PATH.STARTSWITH("/x")` | `httpUri.path.starts-with` |
| `HTTP.REQ.URL.PATH.CONTAINS("/x")` | `httpUri.path.contains` |
| `HTTP.REQ.URL.PATH.EQ("/x")` | `httpUri.path.equals` |
| `HTTP.REQ.HEADER("X").EXISTS` | `httpHeader.X.exists` |
| `HTTP.REQ.HEADER("X").EQ("v")` | `httpHeader.X.equals` |
| `HTTP.REQ.HOSTNAME.EQ("x")` | `httpHost.values` |
| `HTTP.REQ.METHOD.EQ(GET)` | `httpMethod.values` |

| NS Action | LTP Action |
|-----------|------------|
| `redirect "url"` | `httpRedirect.location` |
| `respondwith` (simple) | `httpRedirect` or custom response |
| `insert_http_header` | `httpHeader.insert` |
| `delete_http_header` | `httpHeader.remove` |
| `drop` | `drop` |
| `reset` | `drop` (closest equivalent) |

### Phase 2: Complex Mappings (Medium Confidence)

These require expression parsing and transformation:

| NS Pattern | Approach |
|------------|----------|
| `HTTP.REQ.URL.PATH.GET(1).EQ("api")` | Parse path segment index |
| `HTTP.REQ.URL.QUERY.VALUE("id")` | Map to query parameter match |
| Compound expressions (`&&`, `||`) | Build multiple conditions/rules |
| Negation (`!`) | Use `not` in condition |
| Regex patterns | Map to `matches` operand |

### Phase 3: Unsupported / Manual (Low Confidence)

These require iRules or manual configuration:

| NS Pattern | Reason |
|------------|--------|
| `HTTP.REQ.BODY` | LTP can't inspect body easily |
| `SYS.TIME` | Time-based routing needs iRule |
| `CLIENT.IP.SRC` | Need Data Group + iRule |
| Complex string operations | Beyond LTP capabilities |
| `respondwith` with dynamic content | Needs iRule |
| Cookie manipulation | Limited LTP support |

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LTP CONVERSION PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. EXTRACT POLICIES                                                    │
│     ├─ Collect bound responder policies                                │
│     ├─ Collect bound rewrite policies                                  │
│     └─ Collect CS expressions                                          │
│                                                                         │
│  2. PARSE EXPRESSIONS                                                   │
│     ├─ Tokenize NS PI expression                                       │
│     ├─ Build expression AST                                            │
│     └─ Identify expression components                                  │
│                                                                         │
│  3. CLASSIFY CONVERTIBILITY                                             │
│     ├─ Simple: Direct mapping available                                │
│     ├─ Complex: Transformation required                                │
│     └─ Unsupported: Flag for manual work                               │
│                                                                         │
│  4. BUILD LTP RULES                                                     │
│     ├─ Map conditions                                                  │
│     ├─ Map actions                                                     │
│     └─ Set rule order (priority)                                       │
│                                                                         │
│  5. GENERATE AS3                                                        │
│     ├─ Build Endpoint_Policy object                                    │
│     ├─ Link to Service via policyEndpoint                              │
│     └─ Add to Application                                              │
│                                                                         │
│  6. REPORT COVERAGE                                                     │
│     ├─ List converted policies                                         │
│     ├─ List skipped policies with reason                               │
│     └─ Generate iRule stubs for unsupported                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Expression Parser Design

### NS PI Expression Grammar (Simplified)

```
expression     := term (('&&' | '||') term)*
term           := '!' term | atom | '(' expression ')'
atom           := object '.' method_chain
object         := 'HTTP' | 'CLIENT' | 'SERVER' | 'SYS'
method_chain   := method ('.' method)*
method         := identifier ('(' args ')')?
args           := arg (',' arg)*
arg            := string | number | identifier
```

### Example Parse Tree

Input: `HTTP.REQ.URL.PATH.STARTSWITH("/api") && !HTTP.REQ.HEADER("X-Internal").EXISTS`

```
AND
├── STARTSWITH
│   ├── object: HTTP.REQ.URL.PATH
│   └── arg: "/api"
└── NOT
    └── EXISTS
        └── object: HTTP.REQ.HEADER("X-Internal")
```

### Converter Interface

```typescript
interface ExpressionConverter {
  canConvert(expr: NSExpression): boolean;
  convert(expr: NSExpression): LTPCondition | null;
  getConfidence(): 'high' | 'medium' | 'low';
}

interface ActionConverter {
  canConvert(action: NSAction): boolean;
  convert(action: NSAction): LTPAction | null;
  getConfidence(): 'high' | 'medium' | 'low';
}
```

---

## AS3 Output Example

### Input (NetScaler)

```
# Redirect HTTP to HTTPS
add responder action act_https_redirect redirect "\"https://\" + HTTP.REQ.HOSTNAME + HTTP.REQ.URL"
add responder policy pol_https_redirect "!CLIENT.SSL.IS_SSL" act_https_redirect

# Add forwarded header
add rewrite action act_xff insert_http_header "X-Forwarded-For" CLIENT.IP.SRC
add rewrite policy pol_xff true act_xff

# Content switching
add cs policy pol_api -rule "HTTP.REQ.URL.PATH.STARTSWITH(\"/api\")"
add cs policy pol_static -rule "HTTP.REQ.URL.PATH.STARTSWITH(\"/static\")"

bind lb vserver vs_web -policyName pol_https_redirect -priority 100
bind lb vserver vs_web -policyName pol_xff -priority 200 -type REQUEST
bind cs vserver cs_main -policyName pol_api -targetLBVserver lb_api -priority 100
bind cs vserver cs_main -policyName pol_static -targetLBVserver lb_static -priority 200
```

### Output (AS3)

```json
{
  "class": "Application",
  "vs_web_vs": {
    "class": "Service_HTTPS",
    "virtualAddresses": ["10.1.1.100"],
    "virtualPort": 443,
    "pool": "vs_web_pool",
    "policyEndpoint": "vs_web_ltp"
  },
  "vs_web_ltp": {
    "class": "Endpoint_Policy",
    "strategy": "first-match",
    "rules": [
      {
        "name": "pol_https_redirect",
        "conditions": [
          {
            "type": "tcp",
            "event": "request",
            "address": {
              "operand": "equals",
              "values": ["443"]
            },
            "not": true
          }
        ],
        "actions": [
          {
            "type": "httpRedirect",
            "code": 301,
            "location": "tcl:https://[HTTP::host][HTTP::uri]"
          }
        ]
      },
      {
        "name": "pol_xff",
        "conditions": [],
        "actions": [
          {
            "type": "httpHeader",
            "event": "request",
            "insert": {
              "name": "X-Forwarded-For",
              "value": "tcl:[IP::client_addr]"
            }
          }
        ]
      }
    ]
  }
}
```

---

## Implementation Phases

### Phase 1: Detection and Reporting (MVP)

**Goal**: Identify policies and flag them in export report.

**Deliverables**:
- Detect bound policies in app
- Count policy types
- Generate alerts with policy names
- Suggest manual conversion

**Effort**: 1-2 hours

### Phase 2: Simple Expression Conversion

**Goal**: Convert straightforward expressions automatically.

**Deliverables**:
- Expression tokenizer
- Simple pattern matchers (STARTSWITH, EQ, EXISTS)
- Basic action converters (redirect, header insert/delete)
- Endpoint_Policy builder

**Effort**: 4-6 hours

### Phase 3: Complex Expression Conversion

**Goal**: Handle compound expressions and more patterns.

**Deliverables**:
- Full expression parser
- AND/OR/NOT handling
- Path segment extraction
- Query parameter matching
- Priority ordering

**Effort**: 6-8 hours

### Phase 4: iRule Generation for Unsupported

**Goal**: Generate iRule stubs for unconvertible policies.

**Deliverables**:
- iRule template generator
- Stub with NS expression as comment
- Placeholder logic
- Integration guide

**Effort**: 2-4 hours

---

## Testing Strategy

### Unit Tests

- Expression parser tests (valid/invalid expressions)
- Converter tests (each pattern type)
- Action mapper tests
- AS3 output validation

### Integration Tests

- Full policy conversion flow
- Multiple policies per app
- Policy priority ordering
- Mixed convertible/unconvertible

### Validation Tests

- AS3 schema validation
- Dry-run against BIG-IP
- Behavioral equivalence (where possible)

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Simple expressions converted | 80%+ |
| Complex expressions converted | 50%+ |
| Unconvertible flagged correctly | 100% |
| AS3 output valid | 100% |
| Dry-run pass rate | 95%+ |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| NS PI expressions too complex | Focus on common patterns, flag rest |
| LTP limitations | Document gaps, provide iRule path |
| Performance (large policy sets) | Optimize parser, cache results |
| False confidence | Conservative classification, user review |

---

## References

- [F5 AS3 Endpoint_Policy](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/refguide/schema-reference.html#endpoint-policy)
- [F5 LTM Policies](https://techdocs.f5.com/en-us/bigip-15-1-0/big-ip-local-traffic-manager-implementations/local-traffic-policies.html)
- [NetScaler Policy Infrastructure](https://docs.netscaler.com/en-us/citrix-adc/current-release/appexpert/policies-and-expressions.html)
- [NS Default Syntax Expressions](https://docs.netscaler.com/en-us/citrix-adc/current-release/appexpert/policies-and-expressions/advanced-policy-exp-getting-started.html)

---

## Appendix: Common NS Expression Patterns

### URL Matching

```
HTTP.REQ.URL.PATH.EQ("/")
HTTP.REQ.URL.PATH.STARTSWITH("/api")
HTTP.REQ.URL.PATH.CONTAINS("/admin")
HTTP.REQ.URL.PATH.ENDSWITH(".html")
HTTP.REQ.URL.PATH.GET(1).EQ("v1")
HTTP.REQ.URL.QUERY.VALUE("id").EQ("123")
HTTP.REQ.URL.PATH.REGEX_MATCH(re#^/api/v[0-9]+#)
```

### Header Matching

```
HTTP.REQ.HEADER("Host").EQ("example.com")
HTTP.REQ.HEADER("X-Custom").EXISTS
HTTP.REQ.HEADER("Content-Type").CONTAINS("json")
HTTP.REQ.HEADER("Authorization").STARTSWITH("Bearer")
```

### Method Matching

```
HTTP.REQ.METHOD.EQ(GET)
HTTP.REQ.METHOD.EQ(POST)
HTTP.REQ.METHOD.NE(OPTIONS)
```

### Client Properties

```
CLIENT.IP.SRC.EQ(10.0.0.0/8)
CLIENT.IP.SRC.IN_SUBNET(192.168.0.0/16)
CLIENT.SSL.IS_SSL
CLIENT.SSL.VERSION.EQ(TLSv1.2)
```

### Compound Expressions

```
HTTP.REQ.URL.PATH.STARTSWITH("/api") && HTTP.REQ.METHOD.EQ(GET)
HTTP.REQ.HEADER("X-Internal").EXISTS || CLIENT.IP.SRC.IN_SUBNET(10.0.0.0/8)
!HTTP.REQ.HEADER("Authorization").EXISTS
(HTTP.REQ.URL.PATH.STARTSWITH("/admin") && !CLIENT.SSL.IS_SSL)
```
