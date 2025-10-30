import { Diagnostic } from "vscode";

export type AdcApp = {
    name: string;
    // cs vserver/lb vserver/gslb vserver
    type: Type;
    protocol: Protocol;
    ipAddress?: string;
    port?: string;
    opts?: Opts;
    bindings?: {
        '-lbvserver'?: string[];
        '-policyName'?: PolicyRef[];
        '-domainName'?: DomainBinding[];
        '-serviceName'?: GslbService[];
        service?: Service[];
        serviceGroup?: ServiceGroup[];
        certs?: {
            '-certKeyName'?: string;
            '-cert'?: string;
            '-key'?: string;
        }[];
    };
    csPolicies?: {
        name?: string;
        ['-action']?: string;
        ['-rule']?: string;
    }[];
    csPolicyActions?: CsPolicyActions[];
    appflows?: unknown[];
    lines?: string[];
    // additional apps referenced by this app (ie. cs servers pointing to lb servers)
    apps?: AdcApp[];
    diagnostics?: Diagnostic[] | string[];
    /** Simple array of detected feature names for quick reference */
    features?: string[];
    // Detailed per-app feature analysis (mirrors diagnostics pattern)
    featureAnalysis?: {
        /** Features detected in this specific app */
        features: import('./featureDetector').DetectedFeature[];
        /** Complexity score for this app (1-10) */
        complexity: number;
        /** Recommended F5 platform for this app */
        recommendedPlatform: string;
        /** Confidence level (Low/Medium/High) */
        confidence: string;
        /** Critical conversion gaps specific to this app */
        conversionGaps?: {
            feature: string;
            severity: 'Info' | 'Warning' | 'Critical';
            notes: string;
        }[];
    };
    // mutated params to be feed into the fast template
    fastTempParams?: NsFastTempParams;
};

export type NsFastTempParams = {
    tenant_name: string;
    app_name: string;
    type: string;
    protocol: string;
    virtual_address: string;
    virtual_port: number;
    persistence?: string;
    lbMethod?: string;
    idleTimeout?: number;
    timeout?: number;
    redirectURL?: string;
    backupVServer?: string;
    tcpProfileName?: string;
    monitors?: {
        name: string;
    }[];
    pool_members?: {
        hostname?: string;
        address?: string | number;
        port?: string | number;
        name?: string;
        adminState?: string;
    }[];
    fqdn_members?: {
        hostname?: string;
        port?: string | number;
        adminState?: string;
    }[];
}


export type CsPolicyActions = {
    '-targetLBVserver'?: string;
    '-comment'?: string;
}

export type Appflow = {
    name: string;
    rule: string;
    action?: AppflowAction[];
};

export type AppflowAction = {
    name: string;
    '-securityInsight'?: string;
    collectors?: AppflowCollector[];
};

export type AppflowCollector = {
    name: string;
    '-IPAddress'?: string;
    'port'?: string;
};

export type DomainBinding = {
    '-domainName': string;
};

export type PolicyRef = {
    '-policyName': string;
    '-targetLBVserver'?: string;
    '-priority'?: string;
    opts?: Opts;
};

export type Service = {
    name: string;
    protocol: string;
    port: string;
    opts?: Opts;
    server: string;
    address?: string;
    hostname?: string;
};

export type ServiceGroup = {
    name: string;
    servers: Service[];
    monitors: any[];
};

export type Type = 'cs' | 'lb' | 'gslb' | string;
export type Protocol = 'HTTP' | 'SSL' | 'TCP' | string;
export type Opts = {
    [k: string]: string | unknown;
    '-persistenceType'?: string;
};

export type GslbService = {
    serviceName: string;
    protocol?: 'SSL' | 'HTTP' | 'TCP' | string;
    port?: string;
    serverName?: string;
    serverDest?: string;
};


/**
 * defines the structure of the archive file extraction or single bigip.conf
 */
export type ConfigFile = {
    fileName: string;
    size: number;
    content: string;
};


// /**
//  * array item of returned "apps"
//  */
// export type NsApp = {
//     name: string,
//     configs: string[],
//     map?: AppMap
// }

/**
 * object type for each app map
 * - child of explosion
 */
export type AppMap = {
    // the virtual server clients connect to
    vsDest?: string,
    // default pool members (ip:port)
    pool?: string[]
};


/**
 * main explosion output
 * 
 */
export type Explosion = {
    id: string,
    dateTime: Date,
    hostname?: string,
    inputFileType: string,
    config: {
        sources: ConfigFile[],
        apps?: AdcApp[]
    },
    stats: Stats,
    fileStore?: ConfigFile[]
    // logs?: string[]
}


/**
 * ltm object stats
 *  - child of stats - child of explosion
 * todo: dynamically build this list via the object params built from the regex tree
 */
export type ObjStats = {
    csPolicy?: number,
    csAction?: number,
    csVserver?: number,
    gslbService?: number,
    gslbVserver?: number,
    lbVserver?: number,
    lbMonitor?: number,
    server?: number,
    service?: number,
    serviceGroup?: number
    sslCertKey?: number
}

/**
 * stats object type for object counts
 * - child of explosion
 */
export type Stats = {
    configBytes?: number,
    loadTime?: number,
    parseTime?: number,
    appTime?: number,
    packTime?: number,
    sourceAdcVersion?: string,
    objectCount?: number,
    lineCount?: number,
    objects?: ObjStats
    sourceSize?: number;
}


export type AdcRegExTree = {
    adcVersion: RegExp;
    adcBuild: RegExp;
    // cfgOptions: RegExp;
    // cfgOptionsQuotes: RegExp;
    verbs: RegExp;
    trimQuotes: RegExp;
    parents: {
        // Network & System
        'add ns ip': RegExp;
        'add ns ip6': RegExp;
        'add ns rpcNode': RegExp;
        'add route': RegExp;
        'add dns nameServer': RegExp;
        'add vlan': RegExp;
        'bind vlan': RegExp;
        'add ns netProfile': RegExp;
        'add ns trafficDomain': RegExp;
        'bind ns trafficDomain': RegExp;
        'set ns param': RegExp;
        'set ns hostName': RegExp;

        // Profiles
        'add ns tcpProfile': RegExp;
        'set ns tcpProfile': RegExp;
        'add ns httpProfile': RegExp;
        'set ns httpProfile': RegExp;
        'add ssl profile': RegExp;
        'set ssl profile': RegExp;
        'bind ssl profile': RegExp;
        'add dns profile': RegExp;
        'set dns profile': RegExp;

        // Load Balancing
        'add lb vserver': RegExp;
        'set lb vserver': RegExp;
        'bind lb vserver': RegExp;
        'add lb monitor': RegExp;
        'set lb monitor': RegExp;
        'add lb persistenceSession': RegExp;
        'set lb persistenceSession': RegExp;

        // Services
        'add server': RegExp;
        'add service': RegExp;
        'bind service': RegExp;
        'add serviceGroup': RegExp;
        'bind serviceGroup': RegExp;

        // Content Switching
        'add cs vserver': RegExp;
        'set cs vserver': RegExp;
        'bind cs vserver': RegExp;
        'add cs action': RegExp;
        'add cs policy': RegExp;

        // GSLB
        'add gslb vserver': RegExp;
        'set gslb vserver': RegExp;
        'bind gslb vserver': RegExp;
        'add gslb service': RegExp;
        'add gslb site': RegExp;

        // SSL
        'add ssl certKey': RegExp;
        'set ssl vserver': RegExp;
        'set ssl service': RegExp;
        'bind ssl service': RegExp;
        'bind ssl vserver': RegExp;

        // Policies
        'add rewrite policy': RegExp;
        'add rewrite action': RegExp;
        'add responder policy': RegExp;
        'add responder action': RegExp;
        'add cache policy': RegExp;
        'add cache action': RegExp;
        'add cache contentGroup': RegExp;
        'add cache selector': RegExp;
        'set cache policy': RegExp;
        'bind cache policy': RegExp;
        'add cmp policy': RegExp;
        'add cmp action': RegExp;
        'set cmp policy': RegExp;
        'bind cmp policy': RegExp;

        // Authentication & Authorization
        'add authentication policy': RegExp;
        'add authentication action': RegExp;
        'add aaa vserver': RegExp;
        'bind aaa vserver': RegExp;
        'add authorization policy': RegExp;
        'add authorization action': RegExp;

        // AppFlow
        'add appflow policy': RegExp;
        'add appflow action': RegExp;
        'add appflow collector': RegExp;

        // Rate Limiting
        'add ns limitIdentifier': RegExp;
        'set ns limitIdentifier': RegExp;
        'add ns limitSelector': RegExp;

        // Audit
        'add audit nslogAction': RegExp;
        'add audit nslogPolicy': RegExp;
        'add audit syslogAction': RegExp;
        'add audit syslogPolicy': RegExp;

        // Spillover
        'add spillover policy': RegExp;
        'add spillover action': RegExp;
    }
}


/**
 * @deprecated Use AdcConfObjRx instead
 * This type is used by the old array-based parser (CitrixADCold.ts)
 * The new RX parser uses AdcConfObjRx which stores objects by name in Records
 *
 * Old parser stores config lines as string arrays
 * New parser stores parsed objects with named capture groups
 */
export type AdcConfObj = {
    vserver?: string;
    add?: {
        ns?: {
            ip?: string[];
            ip6?: string[];
        };
        server?: string[];
        service?: string[];
        serviceGroup?: string[];
        ssl?: {
            certKey?: string[];
        };
        lb?: {
            vserver?: string[];
            monitor?: string[];
        };
        cs?: {
            vserver?: string[];
            action?: string[];
            policy?: string[];
        };
        gslb?: {
            vserver?: string[];
            service?: string[];
        }
        rewrite?: {
            policy?: string[];
            action?: string[];
        };
        responder?: {
            policy?: string[];
            action?: string[];
        };
        authentication?: {
            policy?: string[];
            action?: string[];
        };
        cache?: string;
        dns?: {
            nameServer?: string[];
        };
        route?: string[];
        appfw?: string;
        appflow?: {
            policy?: string[];
            action?: string[];
            collector?: string[];
        }
    };
    set?: {
        ns?: {
            config?: string;
            hostName?: string;

        };
        gslb?: {
            vserver?: string[];
        }
        system?: string;
        rsskeytype?: string;
        lacp?: string;
        interface?: string;
        nd6RAvariables?: string;
        snmp?: string;
        cmp?: string;
        service?: string;
        aaa?: string;
        lb?: string;
        cache?: string;
        appflow?: string;
        bot?: string;
        appfw?: string;
        subscriber?: string;
        ssl?: {
            service?: string[];
        };
        cloud?: string;
        cloudtunnel?: string;
        ip6TunnelParam?: string;
        ptp?: string;
        videooptimization?: string;
    };
    bind?: {
        cache?: string;
        lb?: {
            vserver?: string[];
        };
        cs?: {
            vserver?: string[];
        };
        gslb?: {
            vserver?: string[];
        }
        service?: string[]
        serviceGroup?: string[];
        audit?: string;
        tunnel?: string;
        ssl?: {
            service?: string[];
            vserver?: string[];
        };
    };
    enable?: {
        ns?: unknown;
    };
}


/**
 * Parsed NS config object structure using RX engine
 *
 * **Key Improvements over AdcConfObj:**
 * - Objects stored by name in Records (e.g., `Record<string, NsObject>`)
 * - Each object fully parsed with named capture groups (name, protocol, ipAddress, port, etc.)
 * - No need to re-parse config lines - all data is structured
 * - Faster lookups by name vs array iteration
 *
 * **Structure:**
 * ```typescript
 * {
 *   add: {
 *     lb: {
 *       vserver: {
 *         "my_vserver": { name: "my_vserver", protocol: "HTTP", ipAddress: "10.1.1.1", ... }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * **Usage Example:**
 * ```typescript
 * const vserver = config.add?.lb?.vserver?.["my_vserver"];
 * console.log(vserver?.protocol); // "HTTP"
 * ```
 */
export type AdcConfObjRx = {
    vserver?: string;
    add?: {
        // Network & System
        ns?: {
            ip?: Record<string, NsObject>;
            ip6?: Record<string, NsObject>;
            netProfile?: Record<string, NsObject>;
            trafficDomain?: Record<string, NsObject>;
            tcpProfile?: Record<string, NsObject>;
            httpProfile?: Record<string, NsObject>;
            limitIdentifier?: Record<string, NsObject>;
            limitSelector?: Record<string, NsObject>;
        };
        vlan?: Record<string, NsObject>;
        route?: Record<string, NsObject>;
        dns?: {
            nameServer?: Record<string, NsObject>;
            profile?: Record<string, NsObject>;
        };

        // Services & Servers - NOW TYPED ✅
        server?: Record<string, NsServer>;
        service?: Record<string, NsService>;
        serviceGroup?: Record<string, NsServiceGroup>;

        // SSL - NOW TYPED ✅
        ssl?: {
            certKey?: Record<string, SslCertKey>;
            profile?: Record<string, NsObject>;
        };

        // Load Balancing - NOW TYPED ✅
        lb?: {
            vserver?: Record<string, LbVserver>;
            monitor?: Record<string, LbMonitor>;
            persistenceSession?: Record<string, NsObject>;
        };

        // Content Switching - NOW TYPED ✅
        cs?: {
            vserver?: Record<string, CsVserver>;
            action?: Record<string, CsAction>;
            policy?: Record<string, CsPolicy>;
        };

        // GSLB - NOW TYPED ✅
        gslb?: {
            vserver?: Record<string, GslbVserver>;
            service?: Record<string, NsObject>;
            site?: Record<string, NsObject>;
        }

        // Policies
        rewrite?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        responder?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        cache?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
            contentGroup?: Record<string, NsObject>;
            selector?: Record<string, NsObject>;
        };
        cmp?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };

        // Authentication & Authorization
        authentication?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        aaa?: {
            vserver?: Record<string, NsObject>;
        };
        authorization?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };

        // AppFlow & Audit
        appfw?: Record<string, NsObject>;
        appflow?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
            collector?: Record<string, NsObject>;
        }
        audit?: {
            nslogAction?: Record<string, NsObject>;
            nslogPolicy?: Record<string, NsObject>;
            syslogAction?: Record<string, NsObject>;
            syslogPolicy?: Record<string, NsObject>;
        };

        // Spillover
        spillover?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
    };
    set?: {
        ns?: {
            config?: Record<string, NsObject>;
            hostName?: Record<string, NsObject>;
            tcpProfile?: Record<string, NsObject>;
            httpProfile?: Record<string, NsObject>;
            limitIdentifier?: Record<string, NsObject>;
        };
        dns?: {
            profile?: Record<string, NsObject>;
        };
        gslb?: {
            vserver?: Record<string, NsObject>;
        }
        system?: Record<string, NsObject>;
        rsskeytype?: Record<string, NsObject>;
        lacp?: Record<string, NsObject>;
        interface?: Record<string, NsObject>;
        nd6RAvariables?: Record<string, NsObject>;
        snmp?: Record<string, NsObject>;
        cmp?: {
            policy?: Record<string, NsObject>;
        };
        cache?: {
            policy?: Record<string, NsObject>;
        };
        service?: Record<string, NsService>;
        aaa?: Record<string, NsObject>;
        lb?: {
            vserver?: Record<string, LbVserver>;
            monitor?: Record<string, LbMonitor>;
            persistenceSession?: Record<string, NsObject>;
        };
        appflow?: Record<string, NsObject>;
        bot?: Record<string, NsObject>;
        appfw?: Record<string, NsObject>;
        subscriber?: Record<string, NsObject>;
        ssl?: {
            service?: Record<string, NsService>;
            vserver?: Record<string, LbVserver | CsVserver>;
            profile?: Record<string, NsObject>;
        };
        cloud?: Record<string, NsObject>;
        cloudtunnel?: Record<string, NsObject>;
        ip6TunnelParam?: Record<string, NsObject>;
        ptp?: Record<string, NsObject>;
        videooptimization?: Record<string, NsObject>;
        cs?: {
            vserver?: Record<string, CsVserver>;
        };
    };
    bind?: {
        ns?: {
            trafficDomain?: Record<string, NsObject>;
        };
        vlan?: Record<string, NsObject>;
        cache?: Record<string, NsObject>;
        cmp?: {
            policy?: Record<string, NsObject>;
        };
        lb?: {
            vserver?: Record<string, LbVserver>;
        };
        cs?: {
            vserver?: Record<string, CsVserver>;
        };
        gslb?: {
            vserver?: Record<string, GslbVserver>;
        }
        service?: Record<string, NsService>;
        serviceGroup?: Record<string, NsServiceGroup>;
        aaa?: {
            vserver?: Record<string, NsObject>;
        };
        audit?: Record<string, NsObject>;
        tunnel?: Record<string, NsObject>;
        ssl?: {
            service?: Record<string, NsService>;
            vserver?: Record<string, LbVserver | CsVserver>;
            profile?: Record<string, NsObject>;
        };
    };
    enable?: {
        ns?: unknown;
    };
}

/**
 * Base NS object with parsed properties from regex named capture groups
 *
 * **Required Fields:**
 * - `name` - Object name (e.g., vserver name, service name)
 * - `_line` - Original config line for reference
 *
 * **Common Optional Fields (added by regex capture groups):**
 * - `protocol` - Protocol type (HTTP, SSL, TCP, DNS, etc.)
 * - `ipAddress` - IP address for vservers/services
 * - `port` - Port number
 * - `server` - Server name for services
 * - Options prefixed with `-` (e.g., `-persistenceType`, `-cltTimeout`)
 *
 * **Examples:**
 * ```typescript
 * // LB VServer
 * {
 *   name: "web_vs",
 *   protocol: "HTTP",
 *   ipAddress: "10.1.1.100",
 *   port: "80",
 *   "-persistenceType": "SOURCEIP",
 *   "-cltTimeout": "180",
 *   _line: "add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType SOURCEIP"
 * }
 *
 * // Service
 * {
 *   name: "web_svc",
 *   server: "server1",
 *   protocol: "HTTP",
 *   port: "8080",
 *   "-maxClient": "1000",
 *   _line: "add service web_svc server1 HTTP 8080 -maxClient 1000"
 * }
 * ```
 */
export interface NsObject {
    /** Object name (vserver, service, etc.) */
    name: string;

    /** Original config line */
    _line: string;

    // Common fields from capture groups
    /** Protocol (HTTP, SSL, TCP, DNS, etc.) */
    protocol?: string;

    /** IP address for vservers/services */
    ipAddress?: string;

    /** Port number */
    port?: string;

    /** Server name (for services) */
    server?: string;

    /** Server hostname (alternative to address) */
    hostname?: string;

    /** Server address (alternative to hostname) */
    address?: string;

    // All other properties from regex capture groups or parsed options
    // Options prefixed with - (e.g., -persistenceType, -cltTimeout)
    [key: string]: any;
}

/**
 * Load Balancing Virtual Server object
 * Represents a NetScaler LB vserver configuration with all its properties
 *
 * @example
 * ```typescript
 * const lbVserver: LbVserver = {
 *   name: "web_vs",
 *   _line: "add lb vserver web_vs HTTP 10.1.1.100 80 -persistenceType COOKIEINSERT",
 *   protocol: "HTTP",
 *   ipAddress: "10.1.1.100",
 *   port: "80",
 *   "-persistenceType": "COOKIEINSERT",
 *   "-lbMethod": "ROUNDROBIN",
 *   "-cltTimeout": "180"
 * };
 * ```
 */
export interface LbVserver extends NsObject {
    /** Protocol must be defined for LB vservers */
    protocol: string;

    /** IP address (or 0.0.0.0 for ANY) */
    ipAddress?: string;

    /** Port number (or * for ANY) */
    port?: string;

    // ===== Persistence Options =====

    /** Persistence type - controls session persistence behavior
     * @see https://docs.netscaler.com/en-us/netscaler/13-1/load-balancing/load-balancing-persistence.html
     */
    '-persistenceType'?: 'SOURCEIP' | 'COOKIEINSERT' | 'SSLSESSION' | 'RULE' | 'DESTIP' |
                         'SRCIPDESTIP' | 'CALLID' | 'NONE' | string;

    /** Persistence timeout in minutes (default: 2 for SOURCEIP, 0 for others) */
    '-timeout'?: number | string;

    /** Backup persistence type if primary fails */
    '-persistenceBackup'?: 'SOURCEIP' | 'NONE' | string;

    /** Backup persistence timeout in minutes */
    '-backupPersistenceTimeout'?: number | string;

    // ===== Load Balancing Methods =====

    /** Load balancing method - algorithm for distributing traffic
     * @see https://docs.netscaler.com/en-us/netscaler/13-1/load-balancing/load-balancing-customizing-algorithms.html
     */
    '-lbMethod'?: 'ROUNDROBIN' | 'LEASTCONNECTION' | 'LEASTRESPONSETIME' | 'LEASTBANDWIDTH' |
                   'LEASTPACKETS' | 'CUSTOMLOAD' | 'LRTM' | 'URLHASH' | 'DOMAINHASH' |
                   'DESTINATIONIPHASH' | 'SOURCEIPHASH' | 'TOKEN' | 'SRCIPDESTIPHASH' | string;

    /** Fallback load balancing method when primary is unavailable */
    '-lbMethodFallback'?: 'ROUNDROBIN' | 'LEASTCONNECTION' | string;

    // ===== Timeouts & Limits =====

    /** Client idle timeout in seconds */
    '-cltTimeout'?: number | string;

    /** Server idle timeout in seconds */
    '-svrTimeout'?: string;

    /** Maximum client connections */
    '-maxClient'?: number | string;

    /** Maximum requests per connection (HTTP only) */
    '-maxRequests'?: number | string;

    // ===== SSL/TLS Settings =====

    /** Enable SSLv3 (ENABLED/DISABLED) - deprecated, use TLS */
    '-ssl3'?: 'ENABLED' | 'DISABLED' | string;

    /** Enable TLS 1.1 (ENABLED/DISABLED) */
    '-tls11'?: 'ENABLED' | 'DISABLED' | string;

    /** Enable TLS 1.2 (ENABLED/DISABLED) */
    '-tls12'?: 'ENABLED' | 'DISABLED' | string;

    /** Enable TLS 1.3 (ENABLED/DISABLED) */
    '-tls13'?: 'ENABLED' | 'DISABLED' | string;

    // ===== Backup & Redirection =====

    /** Backup vserver name (used when primary is down/at threshold) */
    '-backupVServer'?: string;

    /** URL to redirect to when vserver is down */
    '-redirectURL'?: string;

    /** Redirect from port (HTTP to HTTPS redirect) */
    '-redirectFromPort'?: number | string;

    /** HTTPS redirect URL */
    '-httpsRedirectUrl'?: string;

    /** Redirect port rewrite (ENABLED/DISABLED) */
    '-redirectPortRewrite'?: 'ENABLED' | 'DISABLED' | string;

    // ===== Spillover Options =====

    /** Spillover method */
    '-soMethod'?: 'CONNECTION' | 'BANDWIDTH' | 'HEALTH' | 'NONE' | string;

    /** Connection spillover threshold */
    '-soThreshold'?: number | string;

    /** Backup spillover method */
    '-soBackupAction'?: 'DROP' | 'ACCEPT' | 'REDIRECT' | string;

    // ===== Advanced Options =====

    /** TCP profile name */
    '-tcpProfileName'?: string;

    /** HTTP profile name */
    '-httpProfileName'?: string;

    /** Network profile name */
    '-netProfile'?: string;

    /** Database profile name */
    '-dbProfileName'?: string;

    /** Comment/description */
    '-comment'?: string;

    /** State (ENABLED/DISABLED) */
    '-state'?: 'ENABLED' | 'DISABLED' | string;

    /** Connection failover (DISABLED, STATEFUL, STATELESS) */
    '-connfailover'?: 'DISABLED' | 'STATEFUL' | 'STATELESS' | string;

    /** Insert client IP header (ENABLED/DISABLED) */
    '-cip'?: 'ENABLED' | 'DISABLED' | string;

    /** Client IP header name */
    '-cipHeader'?: string;

    // Extensible for additional options
    [key: string]: any;
}

/**
 * Content Switching Virtual Server object
 * Represents a NetScaler CS vserver configuration
 *
 * @example
 * ```typescript
 * const csVserver: CsVserver = {
 *   name: "cs_vs",
 *   _line: "add cs vserver cs_vs HTTP 10.1.1.200 80",
 *   protocol: "HTTP",
 *   ipAddress: "10.1.1.200",
 *   port: "80",
 *   "-cltTimeout": "180"
 * };
 * ```
 */
export interface CsVserver extends NsObject {
    /** Protocol must be defined for CS vservers */
    protocol: string;

    /** IP address */
    ipAddress?: string;

    /** Port number */
    port?: string;

    // ===== Content Switching Options =====

    /** Default target LB vserver (when no policies match)
     * @see https://docs.netscaler.com/en-us/netscaler/13-1/content-switching.html
     */
    '-lbvserver'?: string;

    /** Target LB vserver for specific policy */
    '-targetLBVserver'?: string;

    /** Policy name for content switching */
    '-policyName'?: string;

    /** Priority for policy evaluation (lower = higher priority) */
    '-priority'?: number | string;

    // ===== Spillover Options =====

    /** Spillover method (CONNECTION, BANDWIDTH, HEALTH, NONE) */
    '-soMethod'?: 'CONNECTION' | 'BANDWIDTH' | 'HEALTH' | 'NONE' | string;

    /** Backup URL for spillover */
    '-soBackupAction'?: string;

    /** Spillover threshold */
    '-soThreshold'?: number | string;

    // ===== State & Timeouts =====

    /** State (ENABLED/DISABLED) */
    '-state'?: 'ENABLED' | 'DISABLED' | string;

    /** State update (ENABLED/DISABLED) - update state from monitors */
    '-stateupdate'?: 'ENABLED' | 'DISABLED' | string;

    /** Client timeout in seconds */
    '-cltTimeout'?: number | string;

    // ===== Advanced Options =====

    /** TCP profile name */
    '-tcpProfileName'?: string;

    /** HTTP profile name */
    '-httpProfileName'?: string;

    /** Comment/description */
    '-comment'?: string;

    /** Case sensitive URL matching (ON/OFF) */
    '-caseSensitive'?: 'ON' | 'OFF' | string;

    /** Redirect URL */
    '-redirectURL'?: string;

    // Extensible for additional options
    [key: string]: any;
}

/**
 * Global Server Load Balancing Virtual Server object
 * Represents a NetScaler GSLB vserver configuration
 *
 * @example
 * ```typescript
 * const gslbVserver: GslbVserver = {
 *   name: "gslb_vs",
 *   _line: "add gslb vserver gslb_vs HTTP",
 *   protocol: "HTTP",
 *   "-lbMethod": "ROUNDROBIN",
 *   "-persistenceType": "SOURCEIP"
 * };
 * ```
 */
export interface GslbVserver extends NsObject {
    // Note: GSLB vservers don't have protocol in add command, it's specified via -serviceType

    // ===== Service Type =====

    /** Service type (HTTP, SSL, TCP, UDP, DNS, etc.)
     * @see https://docs.netscaler.com/en-us/netscaler/13-1/global-server-load-balancing.html
     */
    '-serviceType'?: 'HTTP' | 'SSL' | 'TCP' | 'UDP' | 'DNS' | 'FTP' | 'RTSP' | 'ANY' | string;

    // ===== Load Balancing Methods =====

    /** GSLB load balancing method - algorithm for geographic distribution */
    '-lbMethod'?: 'ROUNDROBIN' | 'LEASTCONNECTION' | 'LEASTRESPONSETIME' | 'SOURCEIPHASH' |
                   'LEASTBANDWIDTH' | 'LEASTPACKETS' | 'RTT' | 'STATICPROXIMITY' |
                   'CUSTOMLOAD' | string;

    /** Backup load balancing method when primary is unavailable */
    '-backupLBMethod'?: 'ROUNDROBIN' | 'LEASTCONNECTION' | 'RTT' | 'STATICPROXIMITY' | string;

    // ===== Persistence =====

    /** Persistence type for GSLB */
    '-persistenceType'?: 'SOURCEIP' | 'NONE' | string;

    /** Persistence timeout in minutes */
    '-timeout'?: number | string;

    /** Persistence ID */
    '-persistenceId'?: number | string;

    // ===== Domain Binding =====

    /** Domain name for GSLB (e.g., www.example.com) */
    '-domainName'?: string;

    /** Domain type */
    '-domainType'?: 'HTTP' | 'SSL' | 'TCP' | 'UDP' | string;

    // ===== State & Options =====

    /** State (ENABLED/DISABLED) */
    '-state'?: 'ENABLED' | 'DISABLED' | string;

    /** Comment/description */
    '-comment'?: string;

    /** Consider effectiveness state */
    '-considerEffectiveState'?: 'NONE' | 'STATE_ONLY' | 'GSLB_STATE' | string;

    /** Netmask for source IP persistence */
    '-netmask'?: string;

    /** IPv6 netmask */
    '-v6netmasklen'?: number | string;

    // Extensible for additional options
    [key: string]: any;
}

/**
 * NetScaler Service Group object
 * Represents a NetScaler serviceGroup configuration object from parsed config
 *
 * @example
 * ```typescript
 * const serviceGroup: NsServiceGroup = {
 *   name: "web_sg",
 *   _line: "add serviceGroup web_sg HTTP -maxClient 0 -maxReq 0",
 *   protocol: "HTTP",
 *   "-maxClient": "0",
 *   "-maxReq": "0",
 *   "-cip": "ENABLED",
 *   "-usip": "NO"
 * };
 * ```
 */
export interface NsServiceGroup extends NsObject {
    /** Protocol for service group */
    protocol: string;

    // Common serviceGroup options
    /** Maximum clients */
    '-maxClient'?: string;

    /** Maximum requests */
    '-maxReq'?: string;

    /** Client IP insertion */
    '-cip'?: string;

    /** Use source IP */
    '-usip'?: string;

    /** Use proxy port */
    '-useproxyport'?: string;

    /** Sure connect */
    '-sp'?: string;

    /** Client timeout */
    '-cltTimeout'?: string;

    /** Server timeout */
    '-svrTimeout'?: string;

    /** Client keep-alive */
    '-CKA'?: string;

    /** TCP buffering */
    '-TCPB'?: string;

    /** Compression */
    '-CMP'?: string;

    /** State */
    '-state'?: string;

    /** Comment */
    '-comment'?: string;

    /** Health monitoring */
    '-healthMonitor'?: string;

    /** Application flow logging */
    '-appflowLog'?: string;
}

/**
 * NetScaler Server object
 * Represents a NetScaler server configuration object from parsed config
 *
 * @example
 * ```typescript
 * const server: NsServer = {
 *   name: "web_server1",
 *   _line: "add server web_server1 10.1.1.10",
 *   address: "10.1.1.10",
 *   "-state": "ENABLED",
 *   "-comment": "Production web server"
 * };
 * ```
 */
export interface NsServer extends NsObject {
    /** Server IP address or hostname (captured as 'dest' in regex) */
    address?: string;

    /** Server hostname (alternative field) */
    hostname?: string;

    // Server options
    /** State (ENABLED/DISABLED) */
    '-state'?: string;

    /** Comment */
    '-comment'?: string;

    /** Traffic domain */
    '-td'?: string;

    /** IPv6 address */
    '-ipv6Address'?: string;
}

/**
 * NetScaler Service object
 * Represents a NetScaler service configuration object from parsed config
 * Binds a server to a protocol/port
 *
 * @example
 * ```typescript
 * const service: NsService = {
 *   name: "web_svc",
 *   _line: "add service web_svc web_server1 HTTP 80",
 *   server: "web_server1",
 *   protocol: "HTTP",
 *   port: "80",
 *   "-maxClient": "0",
 *   "-maxReq": "0"
 * };
 * ```
 */
export interface NsService extends NsObject {
    /** Server name this service is bound to */
    server: string;

    /** Protocol */
    protocol: string;

    /** Port number */
    port: string;

    // Common service options (similar to serviceGroup)
    /** Maximum clients */
    '-maxClient'?: string;

    /** Maximum requests */
    '-maxReq'?: string;

    /** Client IP insertion */
    '-cip'?: string;

    /** Use source IP */
    '-usip'?: string;

    /** Use proxy port */
    '-useproxyport'?: string;

    /** Sure connect */
    '-sp'?: string;

    /** Client timeout */
    '-cltTimeout'?: string;

    /** Server timeout */
    '-svrTimeout'?: string;

    /** Client keep-alive */
    '-CKA'?: string;

    /** TCP buffering */
    '-TCPB'?: string;

    /** Compression */
    '-CMP'?: string;

    /** State */
    '-state'?: string;

    /** Comment */
    '-comment'?: string;
}

/**
 * Load Balancing Monitor object
 * Represents a NetScaler LB monitor configuration
 *
 * @example
 * ```typescript
 * const monitor: LbMonitor = {
 *   name: "http_mon",
 *   _line: "add lb monitor http_mon HTTP -respCode 200 -httpRequest \\"GET /health\\"",
 *   protocol: "HTTP",
 *   "-respCode": "200",
 *   "-httpRequest": "GET /health",
 *   "-interval": "30"
 * };
 * ```
 */
export interface LbMonitor extends NsObject {
    /** Monitor protocol/type (HTTP, HTTPS, TCP, PING, etc.) */
    protocol: string;

    // Monitor options
    /** Expected response code(s) */
    '-respCode'?: string;

    /** HTTP request to send */
    '-httpRequest'?: string;

    /** Expected receive string */
    '-recv'?: string;

    /** String to send */
    '-send'?: string;

    /** Monitoring interval in seconds */
    '-interval'?: string;

    /** Response timeout */
    '-resptimeout'?: string;

    /** Number of retries */
    '-retries'?: string;

    /** Down time before marking down */
    '-downTime'?: string;

    /** Destination IP for monitoring */
    '-destIP'?: string;

    /** Destination port */
    '-destPort'?: string;

    /** Secure flag */
    '-secure'?: string;

    /** LRTM (Least Response Time Monitoring) */
    '-LRTM'?: string;

    /** Custom headers */
    '-customHeaders'?: string;
}

/**
 * SSL Certificate Key
 *
 * Represents a NetScaler SSL certificate and key binding.
 *
 * @see https://docs.netscaler.com/en-us/netscaler/13-1/ssl.html
 *
 * @example
 * ```typescript
 * const sslCert: SslCertKey = {
 *   name: "wildcard_cert",
 *   _line: "add ssl certKey wildcard_cert -cert /nsconfig/ssl/cert.crt -key /nsconfig/ssl/cert.key",
 *   "-cert": "/nsconfig/ssl/cert.crt",
 *   "-key": "/nsconfig/ssl/cert.key",
 *   "-expiryMonitor": "ENABLED",
 *   "-notificationPeriod": "30"
 * };
 * ```
 */
export interface SslCertKey extends NsObject {
    // ===== Certificate & Key Files =====

    /** Certificate file path */
    '-cert'?: string;

    /** Private key file path */
    '-key'?: string;

    /** Certificate password/passphrase */
    '-password'?: string;

    /** Inform format (DER or PEM) */
    '-inform'?: 'DER' | 'PEM' | string;

    // ===== Expiry Monitoring =====

    /** Enable expiry monitoring (ENABLED/DISABLED) */
    '-expiryMonitor'?: 'ENABLED' | 'DISABLED' | string;

    /** Notification period before expiry (days) */
    '-notificationPeriod'?: number | string;

    // ===== Bundle & Chain Options =====

    /** Bundle certificates (YES/NO) */
    '-bundle'?: 'YES' | 'NO' | string;

    /** Link to CA certificate */
    '-linkcertkeyName'?: string;

    /** OCSP check (ENABLED/DISABLED) */
    '-ocspCheck'?: 'ENABLED' | 'DISABLED' | string;

    // Extensible for additional options
    [key: string]: any;
}

/**
 * Content Switching Policy
 *
 * Represents a NetScaler CS policy that defines traffic routing rules.
 *
 * @see https://docs.netscaler.com/en-us/netscaler/13-1/content-switching.html
 *
 * @example
 * ```typescript
 * const csPolicy: CsPolicy = {
 *   name: "pol_api_traffic",
 *   _line: "add cs policy pol_api_traffic -rule 'HTTP.REQ.URL.CONTAINS(\"/api/\")' -action act_api_lb",
 *   "-rule": "HTTP.REQ.URL.CONTAINS(\"/api/\")",
 *   "-action": "act_api_lb"
 * };
 * ```
 */
export interface CsPolicy extends NsObject {
    /** Policy rule expression (NetScaler expression syntax)
     * @see https://docs.netscaler.com/en-us/netscaler/13-1/appexpert/policies-and-expressions.html
     */
    '-rule'?: string;

    /** Action name to execute when rule matches */
    '-action'?: string;

    /** URL for policy documentation/reference */
    '-url'?: string;

    /** Comment/description */
    '-comment'?: string;

    // Extensible for additional options
    [key: string]: any;
}

/**
 * Content Switching Action
 *
 * Represents a NetScaler CS action that specifies the target for matched traffic.
 *
 * @see https://docs.netscaler.com/en-us/netscaler/13-1/content-switching.html
 *
 * @example
 * ```typescript
 * const csAction: CsAction = {
 *   name: "act_api_lb",
 *   _line: "add cs action act_api_lb -targetLBVserver lb_api_pool",
 *   "-targetLBVserver": "lb_api_pool",
 *   "-comment": "Route API traffic to API pool"
 * };
 * ```
 */
export interface CsAction extends NsObject {
    /** Target LB vserver name for this action */
    '-targetLBVserver'?: string;

    /** Target expression (advanced routing) */
    '-targetVserverExpr'?: string;

    /** Comment/description */
    '-comment'?: string;

    // Extensible for additional options
    [key: string]: any;
}

