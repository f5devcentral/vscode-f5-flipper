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
        'add ns ip': RegExp;
        'add ns ip6': RegExp;
        'add ns rpcNode': RegExp;
        'add route': RegExp;
        'add dns nameServer': RegExp;
        'add lb vserver': RegExp;
        'add lb monitor': RegExp;
        'add ssl certKey': RegExp;
        'add server': RegExp;
        'add service': RegExp;
        'add serviceGroup': RegExp;
        'add cs vserver': RegExp;
        'add cs action': RegExp;
        'add cs policy': RegExp;
        'add gslb vserver': RegExp;
        'add gslb service': RegExp;
        'add gslb site': RegExp;
        'add rewrite policy': RegExp;
        'add rewrite action': RegExp;
        'add responder policy': RegExp;
        'add responder action': RegExp;
        'add authentication policy': RegExp;
        'add authentication action': RegExp;
        'add appflow policy': RegExp;
        'add appflow action': RegExp;
        'add appflow collector': RegExp;
        'set ssl vserver': RegExp;
        'set ssl service': RegExp;
        'set lb vserver': RegExp;
        'set lb monitor': RegExp;
        'set cs vserver': RegExp;
        'set ns param': RegExp;
        'set ns hostName': RegExp;
        'set gslb vserver': RegExp;
        'bind service': RegExp;
        'bind serviceGroup': RegExp;
        'bind lb vserver': RegExp;
        'bind cs vserver': RegExp;
        'bind ssl service': RegExp;
        'bind ssl vserver': RegExp;
        'bind gslb vserver': RegExp;
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
        ns?: {
            ip?: Record<string, NsObject>;
            ip6?: Record<string, NsObject>;
        };
        server?: Record<string, NsObject>;
        service?: Record<string, NsObject>;
        serviceGroup?: Record<string, NsObject>;
        ssl?: {
            certKey?: Record<string, NsObject>;
        };
        lb?: {
            vserver?: Record<string, NsObject>;
            monitor?: Record<string, NsObject>;
        };
        cs?: {
            vserver?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
            policy?: Record<string, NsObject>;
        };
        gslb?: {
            vserver?: Record<string, NsObject>;
            service?: Record<string, NsObject>;
        }
        rewrite?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        responder?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        authentication?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
        };
        cache?: Record<string, NsObject>;
        dns?: {
            nameServer?: Record<string, NsObject>;
        };
        route?: Record<string, NsObject>;
        appfw?: Record<string, NsObject>;
        appflow?: {
            policy?: Record<string, NsObject>;
            action?: Record<string, NsObject>;
            collector?: Record<string, NsObject>;
        }
    };
    set?: {
        ns?: {
            config?: Record<string, NsObject>;
            hostName?: Record<string, NsObject>;

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
        cmp?: Record<string, NsObject>;
        service?: Record<string, NsObject>;
        aaa?: Record<string, NsObject>;
        lb?: Record<string, NsObject>;
        cache?: Record<string, NsObject>;
        appflow?: Record<string, NsObject>;
        bot?: Record<string, NsObject>;
        appfw?: Record<string, NsObject>;
        subscriber?: Record<string, NsObject>;
        ssl?: {
            service?: Record<string, NsObject>;
        };
        cloud?: Record<string, NsObject>;
        cloudtunnel?: Record<string, NsObject>;
        ip6TunnelParam?: Record<string, NsObject>;
        ptp?: Record<string, NsObject>;
        videooptimization?: Record<string, NsObject>;
    };
    bind?: {
        cache?: Record<string, NsObject>;
        lb?: {
            vserver?: Record<string, NsObject>;
        };
        cs?: {
            vserver?: Record<string, NsObject>;
        };
        gslb?: {
            vserver?: Record<string, NsObject>;
        }
        service?: Record<string, NsObject>;
        serviceGroup?: Record<string, NsObject>;
        audit?: Record<string, NsObject>;
        tunnel?: Record<string, NsObject>;
        ssl?: {
            service?: Record<string, NsObject>;
            vserver?: Record<string, NsObject>;
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