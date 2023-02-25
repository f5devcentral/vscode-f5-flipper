import { AdcRegExTree } from "./models";
import { nestedObjValue } from "./objects";
import { deepmergeInto } from 'deepmerge-ts'
import { sortNsLines } from "./parseAdc";





export async function parseAdcConfArrays(config: string[], rx: AdcRegExTree) {


    const cfgObj = {}
    let cfgObj2: any = {}
    let item: string;

    sortNsLines(config, rx)

    // loop through each line and parse

    config.forEach(line => {

        // pass all comments
        if (line.startsWith('#')) return;
        if (line === '') return;

        const parents = [
            'add ns ip ',
            'add ns ip6 ',
            'add ns rpcNode ',
            'add route ',
            'add dns nameServer ',
            'add lb vserver ',
            'add lb monitor ',
            'add ssl certKey ',
            'add server ',
            'add service ',
            'add serviceGroup ',
            'add cs vserver ',
            'add cs action ',
            'add cs policy ',
            'add rewrite action ',
            'add rewrite policy ',
            'set ssl vserver ',
            'set lb monitor ',
            'set ns param ',
            'bind service ',
            'bind serviceGroup ',
            'bind lb vserver ',
            'bind cs vserver ',
            'bind ssl vserver '
        ]

        const m1 = parents.filter(el => {
            return line.match(el)?.length
        })[0];

        // if no match return to next config line
        if(!m1) return;

        const body = line.slice(m1.length);

        const tmpObj = nestedObjValue(m1.split(' '), [ body ])
        deepmergeInto(cfgObj, tmpObj)

        const a = 'debugger!'
    })

    return cfgObj;
}

export async function digVserverArrys(app: string) {
    
}