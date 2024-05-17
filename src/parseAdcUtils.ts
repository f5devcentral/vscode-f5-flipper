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
export function parseNsOptions(str: string, rx: AdcRegExTree): { [k: string]: string } {
    const obj = {};

    // grep out all the options with quotes/spaces
    str.match(rx.cfgOptionsQuotes)?.forEach(el => {
        // split the name off by the first space
        const [k, v] = el.split(/ (.*)/);
        obj[k] = v;
        str = str.replace(el, '');
    });

    // capture everything else without spaces
    str.match(rx.cfgOptions)?.forEach(el => {
        const [k, v] = el.split(' ');
        if (k === '-devno') {
            // no nothing, devno is not needed
        } else {
            // add to object
            obj[k] = v;
            str = str.replace(el, '');
        }
    });

    // // turn certain object values to arrays
    // if () {

    // }

    return obj;
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
        const verbs = ['add','set','bind','link','enable','disable'];
        
        const aVerb = a.match(rx.verbs)?.pop()?.trim()!;
        const bVerb = b.match(rx.verbs)?.pop()?.trim()!;
        const aIndex = verbs.indexOf(aVerb);
        const bIndex = verbs.indexOf(bVerb);

        return aIndex - bIndex;
    });
}