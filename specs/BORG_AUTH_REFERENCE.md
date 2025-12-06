# Authentication Object Reference

**Source**: BORG research - Phase 1 Task 1.1 (nFactor Auth Chain Walking)
**Status**: Reference only - Not prioritized for implementation
**Use Case**: Advanced professional services engagement for auth conversion

---

## Overview

This document contains regex patterns and TypeScript type definitions for NetScaler authentication objects (nFactor chains, AAA vservers, LDAP/RADIUS/SAML/OAuth actions).

**Why This Exists**: While not a priority for Phase 1, these patterns and types may be valuable for:
- Future authentication support
- Professional services engagements
- Reference when customers ask about auth conversion
- Type system completeness

---

## Regex Patterns for Authentication Objects

### Authentication vServers

```typescript
// Add to src/regex.ts regexTree.parents object if needed

// Authentication vServers
'add authentication vserver': /(?<name>("[\S ]+"|[\S]+)) (?<protocol>\S+) (?<ipAddress>[\d\w.:]+) (?<port>(\d+|\*)) (?<opts>[\S ]+)/,
'set authentication vserver': /(?<name>("[\S ]+"|[\S]+)) (?<opts>[\S ]+)/,
'bind authentication vserver': /(?<name>("[\S ]+"|[\S]+)) (?<opts>[\S ]+)/,
```

### Policy Labels (nFactor chains)

```typescript
'add authentication policylabel': /(?<name>\S+) (?<opts>[\S ]+)/,
'bind authentication policylabel': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Login Schemas

```typescript
'add authentication loginSchema': /(?<name>\S+) (?<opts>[\S ]+)/,
'add authentication loginSchemaPolicy': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### LDAP Actions

```typescript
'add authentication ldapAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'set authentication ldapAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### RADIUS Actions

```typescript
'add authentication radiusAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'set authentication radiusAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### SAML Actions

```typescript
'add authentication samlAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add authentication samlIdPProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### OAuth Actions

```typescript
'add authentication OAuthAction': /(?<name>\S+) (?<opts>[\S ]+)/,
'add authentication OAuthIdPProfile': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Certificate-based Auth

```typescript
'add authentication certAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Kerberos/NTLM (Negotiation)

```typescript
'add authentication negotiateAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### TACACS+

```typescript
'add authentication tacacsAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### WebAuth (Citrix-specific)

```typescript
'add authentication webAuthAction': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### Authentication Policies

```typescript
'add authentication Policy': /(?<name>\S+) (?<opts>[\S ]+)/,
'set authentication Policy': /(?<name>\S+) (?<opts>[\S ]+)/,
```

### AAA vServers (Legacy, pre-nFactor)

```typescript
'add aaa vserver': /(?<name>\S+) (?<protocol>\S+) (?<opts>[\S ]+)/,
'bind aaa vserver': /(?<name>\S+) (?<opts>[\S ]+)/,
```

**Total**: ~20 authentication object type patterns

---

## TypeScript Type Definitions

### nFactor Chain Structure

```typescript
/**
 * nFactor authentication chain structure
 */
export interface NFactorChain {
    /** Entry point auth vserver */
    authVserver: string;
    /** Chain depth (0-5) */
    depth: number;
    /** All factors in the chain */
    factors: NFactorNode[];
    /** Total policies across all factors */
    policyCount: number;
    /** Authentication methods used (LDAP, RADIUS, SAML, etc.) */
    authMethods: string[];
}
```

### nFactor Node (Single Factor)

```typescript
/**
 * Single node in nFactor chain
 */
export interface NFactorNode {
    /** Factor name (policy label or vserver) */
    name: string;
    /** Depth in chain (0-based) */
    depth: number;
    /** Type: 'vserver' | 'policylabel' */
    type: 'vserver' | 'policylabel';
    /** Bound policies at this factor */
    policies: AuthPolicy[];
    /** Login schema (UI) */
    loginSchema?: string;
    /** Next factor(s) - can branch */
    nextFactors: string[];
}
```

### Authentication Policy

```typescript
/**
 * Authentication policy with action
 */
export interface AuthPolicy {
    /** Policy name */
    name: string;
    /** Policy rule (NetScaler expression) */
    rule: string;
    /** Action name (references LDAP/RADIUS/SAML action) */
    action: string;
    /** Action type (ldap, radius, saml, oauth, cert, etc.) */
    actionType: string;
    /** Action details */
    actionDetails: AuthAction;
    /** Priority */
    priority: number;
    /** Next factor to invoke */
    nextFactor?: string;
    /** Goto expression */
    gotoPriorityExpression?: string;
}
```

### Authentication Action

```typescript
/**
 * Authentication action details (LDAP, RADIUS, SAML, etc.)
 */
export interface AuthAction {
    /** Action name */
    name: string;
    /** Type: ldap, radius, saml, oauth, cert, negotiate, tacacs, webAuth */
    type: string;
    /** Server IP (for LDAP, RADIUS, TACACS) */
    serverIP?: string;
    /** Server port */
    serverPort?: number;
    /** LDAP base DN */
    ldapBase?: string;
    /** LDAP bind DN */
    ldapBindDn?: string;
    /** SAML issuer name */
    samlIdPCertName?: string;
    /** OAuth client ID */
    clientID?: string;
    /** All other options */
    options: { [key: string]: string };
}
```

### Authentication Application

```typescript
/**
 * Authentication application (for AdcApp union type)
 */
export interface AuthApp {
    /** Auth vserver name */
    name: string;
    /** IP address */
    ipAddress: string;
    /** Port */
    port: number;
    /** Protocol (SSL, SSL_TCP) */
    protocol: string;
    /** Full nFactor chain */
    nFactorChain: NFactorChain;
    /** SSL certificates bound */
    sslCertificates: string[];
    /** Session policies */
    sessionPolicies: string[];
}
```

---

## Implementation Notes (If Ever Needed)

### Complexity Considerations

- **Recursive chain walking**: Up to 5 levels deep with cycle detection
- **Branching logic**: Multiple next factors based on policy rules
- **8+ action types**: LDAP, RADIUS, SAML, OAuth, cert, negotiate, TACACS, webAuth
- **F5 mapping challenge**: NetScaler nFactor → F5 APM visual policy editor

### Why This Is Advanced

1. **Professional Services Required**: Auth conversions require deep understanding of:
   - Customer's identity infrastructure (AD, LDAP, RADIUS servers)
   - SSO requirements and federation
   - User experience flows
   - Security policies and compliance

2. **F5 APM Complexity**: APM has 200+ object types, visual policy editor, macros, etc.

3. **Testing Requirements**: Need live auth infrastructure to validate conversions

4. **Low Demand**: As of 2025-01-12, no customer requests for automated auth conversion

### Future Consideration

If customer demand increases, consider:
- Start with simple single-factor LDAP/RADIUS (no nFactor chains)
- Document auth flows (JSON output) rather than full conversion
- Provide auth inventory report (what methods are used, where)
- Professional services offering for manual conversion with Flipper-generated reports

---

**Last Updated**: 2025-01-12
**Status**: Reference Only - Not In Roadmap
