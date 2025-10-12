import { AdcRegExTree, NsObject } from "./models";


/**
 * takes ns config string options and parses them into an object
 * config line:  'add lb monitor app1_http_mon HTTP -respCode 200 -httpRequest "GET /index.html" -LRTM DISABLED'
 * best to remove everything up to the config options
 * example:  '-respCode 200 -httpRequest "GET /index.html" -LRTM DISABLED'
 *
 * returns = {
 *      '-respCode': 200,
 *      '-httpRequest': "GET /index.html",
 *      '-LRTM': 'DISABLED'
 * }
 *
 * Special handling for -cip which can have two values:
 *   '-cip ENABLED client-ip' or '-cip DISABLED'
 *
 * @param str ns adc cfs options as string
 * @param rx regex tree for specific ns adc version
 * @returns options as an object
 */
// Regex pattern that matches "-key value(s)" pairs
// For -cip specifically, it can have two values: "-cip ENABLED X-Forwarded-For"
// The regex captures everything until the next option or end of string
const OPTIONS_REGEX = /(-\S+)\s+((?:"(?:[^"\\]|\\.)*"|(?:(?!\s+-)\S)+(?:\s+(?!\s*-\S)\S+)*)+)/g;

export function parseNsOptions(str: string = "", rx: AdcRegExTree): { [k: string]: string } {
    const obj: { [k: string]: string } = {};

    if (!str) return obj;

    // Reset regex state
    OPTIONS_REGEX.lastIndex = 0;

    // Improved regex now handles multi-value options like -cip automatically
    let match: RegExpExecArray | null;
    while ((match = OPTIONS_REGEX.exec(str)) !== null) {
        const key = match[1];
        let value = match[2];

        // Skip -devno entries
        if (key === '-devno') {
            continue;
        }

        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }

        obj[key] = value;
    }

    return obj;
}


/**
 * detects and trims quotes at the beginning and end of string
 * @param s string
 * @returns
 */
export function trimQuotes(s: string): string {

    // what is the index of the first "
    const first = s.indexOf('"');
    // what is the index of the last "
    const last = s.lastIndexOf('"');
    // get the total length of string
    const stringL = s.length;

    // Do we have a quote at the beginning and end?
    if(first === 0 && last === s.length-1) {
        // return the string between the first and last char (")
        s = s.substring(1, s.length-1)
    }
    return s;
}

// todo: re-enable in the future after our engine rewrite is done
// /**
//  * Sanitize name by replacing spaces with underscores
//  * Standardizes names for easier processing and prevents issues with spaces in identifiers
//  * @param name - The name to sanitize
//  * @returns Sanitized name with underscores instead of spaces
//  */
// export function sanitizeName(name: string): string {
//     return name.replace(/\s+/g, '_');
// }


/**
 * Extract options from parsed NS object (exclude special internal properties)
 * Shared utility to avoid duplication across digester functions
 * @param obj Parsed NS object
 * @param excludeFields Additional fields to exclude beyond defaults
 * @returns Object containing only the option fields
 */
export function extractOptions(obj: NsObject, excludeFields: string[] = []): Record<string, any> {
    const defaultExclude = ['name', '_line', 'protocol', 'ipAddress', 'port', 'server'];
    const allExclude = new Set([...defaultExclude, ...excludeFields]);

    const opts: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (!allExclude.has(key)) {
            opts[key] = value;
        }
    }
    return opts;
}

/**
 * sort ns adc config by verbs
 *  add -> set -> bind -> link -> enable -> disable
 * @param cfg
 * @param rx
 * @returns
 */
export function sortNsLines(cfg: string[], rx: AdcRegExTree) {

    cfg.sort((a, b) => {

        // the order of these verb will set the order of the ns config lines
        const verbs = ['add','set','bind','link','enable','disable']

        const aVerb = a.match(rx.verbs)?.pop()?.trim()!
        const bVerb = b.match(rx.verbs)?.pop()?.trim()!
        const aIndex = verbs.indexOf(aVerb)
        const bIndex = verbs.indexOf(bVerb)

        return aIndex - bIndex
    })
}