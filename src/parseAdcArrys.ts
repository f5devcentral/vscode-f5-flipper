import { AdcRegExTree, AdcConfObj } from "./models";
import { nestedObjValue } from "./objects";
import { deepmergeInto } from 'deepmerge-ts';
import { sortNsLines } from "./parseAdcUtils";





export async function parseAdcConfArrays(config: string[], cfgObj: AdcConfObj, rx: AdcRegExTree) {


    // const cfgObj = {}
    // let cfgObj2: any = {}
    // let item: string;

    sortNsLines(config, rx);

    // loop through each line and parse

    Promise.all(config.map(line => {

        // pass all comments and empty lines
        if (line.startsWith('#')) {return;}
        if (line === '') {return;}

        // grab all the keys from the parents rx list
        const parents = Object.keys(rx.parents);

        // filter out the config item that have a regex
        const m1 = parents.filter(el => {
            return line.match(el + ' ');
        })[0];

        // if no match return to next config line
        if(!m1) {return;}

        
        // now that we have m1, trim leading/trailing spaces
        const m2 = m1.trim();
        // split by spaces into an array
        const location = m2.split(' ');
        // pop the last item off the array, should be object type (vserver/...)
        const name = location.pop() as string;
        // split the details off the parent
        const body = line.slice(m1.length + 1);

        // create the nested object/details
        const tmpObj = nestedObjValue(location, { [name]: [ body ] });
        // merge with main object
        deepmergeInto(cfgObj, tmpObj);

        const a = 'debugger!';
    }));

    // return cfgObj;
}

