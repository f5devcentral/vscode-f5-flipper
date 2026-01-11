# backupTest-full.tgz

Full system backup archive from NetScaler test appliance containing rich configuration for Flipper integration testing.

## Archive Details

| Property | Value |
|----------|-------|
| Filename | `backupTest-full.tgz` |
| Size | 3.8 MB |
| Created | 2025-12-13 |
| Backup Level | full |
| Total Files | 297 |
| Source Host | 52.180.146.197 |
| NetScaler Version | NS13.1 Build 61.23.nc |

## Source Configuration

The archive was created from [backupTest.ns.conf](backupTest.ns.conf) deployed via MCP `deploy_config` tool with `provision_test_certs=true`.

### Configuration Summary

| Object Type | Count | Details |
|-------------|-------|---------|
| Servers | 6 | web1-3, api1-2, static1 |
| Monitors | 5 | HTTP, HTTP-ECV, TCP, USER (custom script) |
| Service Groups | 3 | sg_web_prod, sg_api_prod, sg_static |
| LB Virtual Servers | 5 | HTTP redirect, HTTPS (web, api, static, internal) |
| CS Virtual Servers | 1 | cs_main_https (routes to LB vservers) |
| SSL Certificates | 3 | wildcard_cert, api_cert, internal_cert |
| Profiles | 4 | TCP, HTTP, SSL frontend, SSL backend |
| Rewrite Policies | 4 | Security headers (X-Frame, XSS, nosniff, Server strip) |
| Responder Policies | 4 | HTTPS redirect, maintenance, health check, rate limit |
| CS Policies | 3 | API routing, static routing, default |
| CMP Policies | 3 | Text, JSON compression, no-compress |
| Rate Limiters | 2 | API rate limit, login rate limit |
| Audit Policies | 1 | Syslog action + policy |
| Authorization Policies | 1 | Allow all |

## Archive Contents

### /nsconfig (Application Config)

```
backup/nsconfig/
├── ns.conf                    # Running configuration
├── ns.conf.bak                # Backup config
├── ns.conf.0 - ns.conf.4      # Config history
├── ssl/
│   ├── wildcard_cert.cer      # Test SSL certificate
│   ├── wildcard_cert.key      # Test SSL private key
│   ├── api_cert.cer           # API SSL certificate
│   ├── api_cert.key           # API SSL private key
│   ├── internal_cert.cer      # Internal SSL certificate
│   ├── internal_cert.key      # Internal SSL private key
│   ├── ns-server.*            # System certificates (preserved)
│   ├── ns-root.*              # Root CA (preserved)
│   └── ns-sftrust.*           # Trust chain (preserved)
├── monitors/
│   └── sample_monitor.sh      # Custom USER monitor script
├── license/                   # License files
├── ssh/                       # SSH host keys
├── dns/                       # DNS configuration
└── keys/                      # Encryption keys
```

### /var (Runtime Data)

```
backup/var/
├── ns_sys_backup/             # System backup location
├── nslog/                     # Log files
│   └── asl/                   # ASL logs
├── vpn/                       # VPN themes and config
├── netscaler/
│   ├── ssl/                   # SSL session data
│   ├── locdb/                 # Location database
│   └── logon/                 # Logon themes
├── nstemplates/               # Application templates
├── download/                  # Downloaded files
├── learnt_data/               # Machine learning data
├── metrics_conf/              # Metrics configuration
│   ├── schema.json
│   └── reference_schema.json
└── nextgen/                   # NextGen features
```

## Usage

### Extract Archive

```bash
tar -xzf backupTest-full.tgz
```

### Restore to NetScaler

```bash
# Upload archive
scp backupTest-full.tgz nsroot@<netscaler>:/var/ns_sys_backup/

# SSH to NetScaler and restore
ssh nsroot@<netscaler>
> restore system backup backupTest-full -level full
> reboot
```

### Parse Configuration

```bash
# Extract just ns.conf for parsing
tar -xzf backupTest-full.tgz backup/nsconfig/ns.conf -O > ns.conf

# Extract SSL certificates
tar -xzf backupTest-full.tgz backup/nsconfig/ssl/
```

## Flipper Integration Testing

This archive is designed to test:

1. **Backup parsing** - Extract and parse ns.conf from archive
2. **Certificate handling** - Include/exclude SSL cert files in migration
3. **Custom monitors** - Handle external script references
4. **Profile references** - TCP, HTTP, SSL profiles linked to vservers
5. **Policy chains** - Rewrite/responder policies bound to vservers
6. **Content switching** - CS vserver with policy-based routing
7. **Rate limiting** - Stream selectors and limit identifiers

## Related Files

- [backupTest.ns.conf](backupTest.ns.conf) - Source configuration file
- [sample_monitor.sh](sample_monitor.sh) - Custom monitor script
- [extracted/](extracted/) - Configs extracted from running NetScaler
