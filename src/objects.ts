


/**
 * builds multi-level nested objects with data
 * https://stackoverflow.com/questions/5484673/javascript-how-to-dynamically-create-nested-objects-using-object-names-given-by
 * @param fields array of nested object params
 * @param value value of the inner most object param value (string/array/object)
 */
export function nestedObjValue(fields: string[], value: unknown): unknown {
    const reducer = (acc, item, index, arr) => ({ [item]: index + 1 < arr.length ? acc : value });
    return fields.reduceRight(reducer, {});
}


// export function deepGet(obj: Object, path: string) {

//     return path.split(".")
//     .reduce((o, key) => o && typeof o[key] !== 'undefined' ? o[key] : undefined, obj)
// }