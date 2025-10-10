import { AdcRegExTree, AdcConfObjRx } from "./models";
import { nestedObjValue } from "./objects";
import { deepmergeInto } from 'deepmerge-ts'
import { parseNsOptions } from "./parseAdcUtils";




/**
 * Parse NS config lines with full RX parsing
 * Stores fully parsed objects instead of unparsed strings
 * @param config Array of config lines
 * @param cfgObj Target AdcConfObjRx to populate
 * @param rx Regex tree for pattern matching
 */
export async function parseAdcConfArraysRx(config: string[], cfgObj: AdcConfObjRx, rx: AdcRegExTree) {

    // Optional: sortNsLines(config, rx) - currently disabled to process in original order

    // Cache parent keys for faster lookups
    const parents = Object.keys(rx.parents);

    // Counter for bind statements to create unique keys
    let bindCounter = 0;

    // Process each line sequentially
    for (const line of config) {

        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') continue;

        // Find matching parent pattern (e.g., "add lb vserver")
        const matchedParent = parents.find(parent => line.match(parent + ' '));

        if (!matchedParent) continue;

        // Extract verb and object type (e.g., "add lb vserver" -> ["add", "lb", "vserver"])
        const location = matchedParent.trim().split(' ');
        const objectType = location.pop() as string;  // "vserver"
        const verb = location[0];  // "add", "bind", "set", etc.

        // Extract body after verb/type
        const body = line.slice(matchedParent.length + 1);

        // Parse the line fully with RX
        const parsedObj = parseNsLineWithRx(matchedParent, body, line, rx);

        // For "bind" statements, create unique keys for each binding line
        // This prevents multiple bindings from being merged into one object
        if (verb === 'bind') {
            // Use name + counter as unique key for this bind statement
            const uniqueKey = `${parsedObj.name}_${bindCounter++}`;
            const tmpObj = nestedObjValue(location, { [objectType]: { [parsedObj.name]: { [uniqueKey]: parsedObj } } });
            deepmergeInto(cfgObj, tmpObj);
        } else {
            // For add/set/enable/disable, use name as key (allow merging)
            const tmpObj = nestedObjValue(location, { [objectType]: { [parsedObj.name]: parsedObj } });
            deepmergeInto(cfgObj, tmpObj);
        }
    }

}


/**
 * Parse NS config line fully with RX patterns
 * Uses named capture groups from regex patterns to extract all properties
 * @param objectType Full object type (e.g., "add lb vserver")
 * @param body Line body after verb/type (e.g., "web_vs HTTP 10.1.1.100 80")
 * @param fullLine Complete original line
 * @param rx Regex tree
 * @returns Fully parsed object with all properties from capture groups
 */
function parseNsLineWithRx(
    objectType: string,
    body: string,
    fullLine: string,
    rx: AdcRegExTree
): Record<string, any> {

    const result: Record<string, any> = {
        _line: fullLine  // Always preserve original line
    };

    // Get the regex pattern for this object type
    const pattern = rx.parents[objectType as keyof typeof rx.parents];

    if (!pattern) {
        // Fallback: just extract name if no pattern exists
        const tokens = body.split(/\s+/);
        result.name = tokens[0];
        return result;
    }

    // Match body against the pattern
    const match = body.match(pattern);

    if (match && match.groups) {
        // Extract all named capture groups
        for (const [key, value] of Object.entries(match.groups)) {
            if (value !== undefined) {
                // Clean up quoted names
                if (key === 'name' && value.startsWith('"') && value.endsWith('"')) {
                    result[key] = value.slice(1, -1);  // Remove quotes
                } else if (key === 'opts') {
                    // Parse options string into individual key-value pairs
                    const parsedOpts = parseNsOptions(value, rx);
                    // Merge parsed options into result object (keep dashes to match NS format)
                    Object.assign(result, parsedOpts);
                } else {
                    result[key] = value;
                }
            }
        }
    } else {
        // Fallback: extract just the name
        const tokens = body.split(/\s+/);
        result.name = tokens[0];
    }

    return result;
}
