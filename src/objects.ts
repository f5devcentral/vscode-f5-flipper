

import deepmerge from 'deepmerge'

/**
 * builds multi-level nested objects with data
 * https://stackoverflow.com/questions/5484673/javascript-how-to-dynamically-create-nested-objects-using-object-names-given-by
 * @param fields array of nested object params
 * @param value value of the inner most object param value
 */
export function nestedObjValue(fields: string[], value: string): unknown {
    const reducer = (acc, item, index, arr) => ({ [item]: index + 1 < arr.length ? acc : value });
    return fields.reduceRight(reducer, {});
}





/**
* provides deep merge of multi-level objects
*  subsequent items in list overwrite conflicting entries
* @param objs list of objects to merge
 */
export function deepMergeObj(target: unknown, source: unknown,): unknown {
    return deepmerge(
        target as Partial<unknown>,
        source as Partial<unknown>,
        { clone: false }
    )
}