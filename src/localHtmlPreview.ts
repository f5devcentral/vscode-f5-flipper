/* 
 * Local implementation of f5-fast-core HTML preview generation
 * Copied from @f5devcentral/f5-fast-core v0.23.0 for customization
 */

'use strict';

const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');

// Disable HTML escaping - matches f5-fast-core behavior
Mustache.escape = function escape(text: string): string {
    return text;
};

/**
 * Generate HTML preview for FAST template - local implementation
 * @param schema - JSON schema for the template
 * @param view - Default view/parameter values
 * @returns HTML string
 */
export const generateHtmlPreview = (schema: any, view: any): string => {
    schema = modSchemaForJSONEditor(schema);

    // Read template from file
    const templatePath = path.join(__dirname, '../media/fastPreview.html');
    // /home/ted/vscode-f5-flipper/media/fastPreview.html
    let htmlTemplate: string;

    try {
        htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('Failed to read template file:', error);
    }


    // create a regex to replace the placeholders entire line
    const re = htmlTemplate
        .replace(
            /^\s+const schema = [\S ]+\n$/m,
            `const schema = ${JSON.stringify(schema)};`
        )
        .replace(
            /^\s+const startval = [\S ]+\n$/m,
            `const startval = ${JSON.stringify(filterExtraProperties(view, schema))};`
        );

    return re;
};


const injectFormatsIntoSchema = (schema: any): void => {
    Object.values(schema).forEach((item: any) => {
        if (item !== null && typeof item === 'object') {
            if (item.type === 'boolean') {
                item.format = 'checkbox';
            } else if (item.type === 'array') {
                if (item.uniqueItems && item.items && item.items.enum) {
                    item.format = 'select';
                } else {
                    item.format = 'table';
                }
            } else if (item.format === 'text') {
                item.format = 'textarea';
            }

            injectFormatsIntoSchema(item);
        }
    });
};

const addDepsToSchema = (schema: any): void => {
    if (schema.dependencies) {
        Object.keys(schema.dependencies).forEach((key) => {
            if (!schema.properties[key]) {
                return;
            }
            const depsOpt = schema.dependencies[key].reduce((acc: any, curr: string) => {
                acc[curr] = !(
                    schema.properties[key].invertDependency
                    && schema.properties[key].invertDependency.includes(curr)
                );
                return acc;
            }, {});
            schema.properties[key].options = Object.assign({}, schema.properties[key].options, {
                dependencies: depsOpt
            });
        });
    }
    if (schema.properties) {
        Object.values(schema.properties).forEach((item: any) => {
            addDepsToSchema(item);
            delete item.invertDependency;
        });
    }
};

const keyInXOf = (key: string, schema: any): boolean => {
    let found = false;
    ['oneOf', 'allOf', 'anyOf'].forEach((xOf) => {
        if (!schema[xOf]) {
            return;
        }
        schema[xOf].forEach((subSchema: any) => {
            if (subSchema.properties && subSchema.properties[key] !== undefined) {
                found = true;
                return;
            }
            found = keyInXOf(key, subSchema) || found;
        });
    });

    return found;
};

const fixAllOfOrder = (schema: any, orderID: number = 0): number => {
    if (schema.allOf) {
        schema.allOf.forEach((subSchema: any) => {
            orderID = fixAllOfOrder(subSchema, orderID);
        });
    }

    if (schema.properties) {
        Object.keys(schema.properties).forEach((key) => {
            const prop = schema.properties[key];
            if (!prop.propertyOrder && !keyInXOf(key, schema)) {
                prop.propertyOrder = orderID;
                orderID += 1;
            }
        });
    }

    return orderID;
};

const mergeWith = (target: any, ...sources: any[]): any => {
    // Simple merge implementation - replace with lodash.mergeWith if needed
    sources.forEach(source => {
        if (source) {
            Object.keys(source).forEach(key => {
                if (source[key] !== undefined) {
                    if (typeof target[key] === 'object' && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        target[key] = mergeWith(target[key] || {}, source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            });
        }
    });
    return target;
};

const mergeAllOf = (schema: any): any => {
    if (!schema.allOf) {
        return schema;
    }

    schema.allOf.forEach((subSchema: any) => mergeAllOf(subSchema));

    mergeWith(schema, ...schema.allOf);
    delete schema.allOf;

    return schema;
};

const collapseAllOf = (schema: any): any => {
    fixAllOfOrder(schema);
    return mergeAllOf(schema);
};

const mergeMixins = (schema: any): any => {
    // No anyOf, nothing to do
    if (!schema.anyOf) {
        return schema;
    }

    // Check to see if an item is empty, which implies mixins
    let isMixins = false;
    schema.anyOf.forEach((item: any) => {
        if (Object.keys(item).length === 0) {
            isMixins = true;
        } else if (item.type && item.type === 'object'
            && item.properties && Object.keys(item.properties).length === 0) {
            isMixins = true;
        }
    });
    if (!isMixins) {
        return schema;
    }

    // Merge mixins, but do not make them required
    schema.anyOf.forEach((item: any) => {
        item = mergeMixins(item);
        mergeWith(schema.properties, item.properties || {});
        mergeWith(schema.dependencies, item.dependencies || {});
    });
    delete schema.anyOf;

    return schema;
};

const removeMathExpressions = (schema: any): any => {
    if (!schema.properties) {
        return schema;
    }

    schema.properties = Object.keys(schema.properties).reduce((acc: any, curr) => {
        const prop = schema.properties[curr];
        const remove = (
            typeof prop.mathExpression !== 'undefined'
            && prop.format && prop.format === 'hidden'
            && !prop.title
            && !prop.description
        );
        if (!remove) {
            acc[curr] = prop;
        }
        return acc;
    }, {});

    return schema;
};

const modSchemaForJSONEditor = (schema: any): any => {
    schema = JSON.parse(JSON.stringify(schema)); // Do not modify original schema
    schema.title = schema.title || 'Template';
    schema = collapseAllOf(schema);
    injectFormatsIntoSchema(schema);
    schema = mergeMixins(schema);
    addDepsToSchema(schema);
    schema = removeMathExpressions(schema);

    return schema;
};

const filterExtraProperties = (view: any, schema: any): any => Object.keys(view).reduce((acc: any, curr) => {
    const exists = (
        (schema.properties && schema.properties[curr] !== undefined)
        || keyInXOf(curr, schema)
    );
    if (exists) {
        acc[curr] = view[curr];
    }
    return acc;
}, {});