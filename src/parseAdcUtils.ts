import { AdcRegExTree } from "./models";


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
 * @param str ns adc cfs options as string
 * @param rx regex tree for specific ns adc version
 * @returns options as an object
 */
export function parseNsOptions(str: string = "", rx: AdcRegExTree): { [k: string]: string } {
    const obj = {}

    // if(str === undefined) return obj;

    // 12.11.2024:  this is a hack to get the regex working for now. 
    // The current rx doesn't pick up the last "-key value" since it uses forward lookups.
    str = str.concat(" -devno 12345")

    // grep out all the options with quotes/spaces/normal
    // tested with https://regex101.com/r/WCU928/1
    const matches = str.match(/(?<key>-\S+) (?<value>.*?) (?=-\S+)/g);
    
    matches?.forEach(el => {
        // split the name off by the first space
        const k = el.substring(0, el.indexOf(' '));
        // everything after the first space and trim any trailing white space
        const v = el.substring(el.indexOf(' ') + 1).trimEnd().replaceAll(/^\"|\"$/g, "");

        if(k === '-devno') {

            // skip adding it to the return object
        } else {

            obj[k] = trimQuotes(v);
        }
        str = str.replace(el, '')
    })

    // only thing left in the string should be '-devno 123456'
    // todo: add some logic to check if other things are left outside -devno and log those details for visibility

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