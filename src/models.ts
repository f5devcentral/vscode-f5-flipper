
export type AdcApp = {
    name: string;
    // cs vserver/lb vserver/gslb vserver
    type: Type;
    protocol: Protocol;
    ipAddress?: string;
    port?: string
    opts?: Opts;
    bindings?: {
        '-lbvserver'?: string[];
        '-policyName'?: PolicyRef[];
        '-domainName'?: DomainBinding[];
        '-serviceName'?: GslbService[];
        service?: Service[];
        serviceGroup?: string[];
    };
    csPolicies?: unknown[];
    csPolicyActions?: unknown[];
    appflows?: unknown[];
    lines?: string[];
    // additional apps referenced by this app (ie. cs servers pointing to lb servers)
    apps?: AdcApp[];
};

export type Appflow = {
    name: string;
    rule: string;
    action?: AppflowAction[];
};

export type AppflowAction = {
    name: string;
    '-securityInsight'?: string;
    collectors?: AppflowCollector[] ;
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
    opts?: Opts;
} | string;

export type Service = {
    name: string;
    protocol: string;
    port: string;
    opts?: Opts;
    server: string;
};

export type Type = 'cs' | 'lb' | 'gslb' | string;
export type Protocol = 'HTTP' | 'SSL' | 'TCP' | string;
export type Opts =  { [k: string]: string | unknown};

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
    logs: string[]
}


/**
 * ltm object stats
 *  - child of stats - child of explosion
 */
export type ObjStats = {
    csPolicy?: number,
    csAction?: number,
    csVserver?: number,
    lbVserver?: number,
    lbMonitor?: number,
    server?: number,
    service?: number,
    serviceGroup?: number
    sslCerKey?: number
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
    cfgOptions: RegExp;
    cfgOptionsQuotes: RegExp;
    verbs: RegExp;
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
        'add rewrite action': RegExp;
        'add rewrite policy': RegExp;
        'add appflow policy': RegExp;
        'add appflow action': RegExp;
        'add appflow collector': RegExp;
        'set ssl vserver': RegExp;
        'set ssl service': RegExp;
        'set lb monitor': RegExp;
        'set ns param': RegExp;
        'set ns hostName': RegExp;
        'set gslb vserver': RegExp;
        'bind service': RegExp;
        'bind serviceGroup': RegExp;
        'bind lb vserver': RegExp;
        'bind cs vserver': RegExp;
        'bind ssl vserver': RegExp;
        'bind gslb vserver': RegExp;
    }
}


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
            action?: string[];
            policy?: string[];
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
        serviceGroup?: string[];
        audit?: string;
        tunnel?: string;
        ssl?: {
            vserver?: string[];
        };
    };
    enable?: {
        ns?: unknown;
    };
}