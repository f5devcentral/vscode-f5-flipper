


export type AdcConfObj = {
    vserver?: string;
    set?: {
        ns?: {
            config?: string;
            hostname?: string;

        };
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
        ssl?: string;
        cloud?: string;
        cloudtunnel?: string;
        ip6TunnelParam?: string;
        ptp?: string;
        videooptimization?: string;
    };
    enable?: {
        ns?: unknown;
    };
    add?: {
        ns?: {
            ip?: string[];
            ip6?: string[];
        };
        server?: string[];
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
    };
    bind?: {
        cache?: string;
        lb?: {
            vserver?: string[];
        };
        cs?: {
            vserver?: string[];
        };
        serviceGroup?: string[];
        audit?: string;
        tunnel?: string;
        ssl?: {
            vserver?: string[];
        };
    };
}

/**
 * defines the structure of the archive file extraction or single bigip.conf
 */
export type ConfigFile = {
    fileName: string,
    size: number,
    content: string
}


/**
 * array item of returned "apps"
 */
export type NsApp = {
    name: string,
    configs: string[],
    map?: AppMap
}

/**
 * object type for each app map
 * - child of explosion
 */
export type AppMap = {
    // the virtual server clients connect to
    vsDest?: string,
    // default pool members (ip:port)
    pool?: string[]
}


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
        apps?: NsApp[],
        base?: string[],
        doClasses?: string[]
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
    virtuals?: number,
    profiles?: number,
    policies?: number,
    pools?: number,
    irules?: number,
    monitors?: number,
    nodes?: number,
    snatPools?: number
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
    'add rewrite action': RegExp;
    'add rewrite policy': RegExp;
    'set ssl vserver': RegExp;
    'set lb monitor': RegExp;
    'set ns param': RegExp;
    'bind service': RegExp;
    'bind serviceGroup': RegExp;
    'bind lb vserver': RegExp;
    'bind cs vserver': RegExp;
    'bind ssl vserver': RegExp;
}