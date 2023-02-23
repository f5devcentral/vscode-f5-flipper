import { AdcRegExTree } from "./models";
import { deepMergeObj, nestedObjValue } from "./objects";






export async function parseAdcConf(config: string[], rx: AdcRegExTree) {


    let cfgObj: any  = {}
    let cfgObj2: any = {}

    // loop through each line and parse

    config.forEach(line => {

        // add/bind/set

        if (line.startsWith('#')) return;

        // set ns config
        if (line.startsWith('set ns config')) {

            // const lineA = line
            // const objType = line.slice(0, 12).split(' ')
            const objBody = line.slice(12)
            const newOjb = nestedObjValue(['set', 'ns', 'config'], objBody)
            cfgObj = deepMergeObj(cfgObj, newOjb)
        }

        if (line.startsWith('set ns hostname')) {
            const objBody = line.slice(14)
            const newOjb = nestedObjValue(['set', 'ns', 'hostname'], objBody)
            cfgObj = deepMergeObj(cfgObj, newOjb)
        }

        if (line.startsWith('set ns hostname')) {
            const objBody = line.slice(14)
            const newOjb = nestedObjValue(['set', 'ns', 'hostname'], objBody)
            cfgObj = deepMergeObj(cfgObj, newOjb)
        }

        const bLine = line.split(' ')
        const parent = bLine.splice(0, 2)
        const bOjb = nestedObjValue(parent, bLine.join())
        cfgObj2 = deepMergeObj(cfgObj2, bOjb)

        const a = 'asdf'
    })
    const b = 'zxcv'
}