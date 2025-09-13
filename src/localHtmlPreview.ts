/* 
 * Local implementation of f5-fast-core HTML preview generation
 * Copied from @f5devcentral/f5-fast-core v0.23.0 for customization
 */

'use strict';

const Mustache = require('mustache');

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
    const htmlView = {
        schema_data: JSON.stringify(schema),
        default_view: JSON.stringify(filterExtraProperties(view, schema))
    };
    const re = Mustache.render(htmlTemplate, htmlView);
    return re;
};


// HTML template - copied from f5-fast-core html_stub.js
const htmlTemplate = `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Template Preview</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="./styles/vscode.css">
</head>

<body>
    <div id="editor"></div>
    
    <button onclick="vscode.postMessage(editor.getValue())">Render</button>
    <p></p>
    
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@json-editor/json-editor@2.5.1/dist/jsoneditor.min.js"></script>
    <script>
        // JSON Schema for the editor
        const schema = {{{schema_data}}};
        
        // initial values
        const startval = {{{default_view}}};
        
        // editor options
        const editorOptions = {
            compact: true,
            show_errors: 'always',
            disable_edit_json: false,
            disable_properties: false,
            disable_collapse: true,
            array_controls_top: true,
            show_opt_in: true,
            disable_array_reorder: true,
            theme: 'bootstrap4'
        };

        // create the editor
        const editor = new JSONEditor(document.getElementById('editor'), {
            schema,
            startval,
            ...editorOptions
        });

        // initialize VS Code API
        (function init() {
            const vscode = acquireVsCodeApi();
            document.vscode = vscode;
        })();

    </script>
</body>
</html>

<!-- PROTOTYPE ADDITIONS - START -->
<div class="mt-4">
    <details class="mt-3">
        <summary><strong>Schema</strong></summary>
        <pre id="schemaDisplay" class="bg-light p-3 mt-2"></pre>
    </details>

    <details class="mt-3">
        <summary><strong>Start Values</strong></summary>
        <pre id="startValDisplay" class="bg-light p-3 mt-2"></pre>
    </details>

    <details class="mt-3">
        <summary><strong>Editor Options</strong></summary>
        <pre id="editorOptionsDisplay" class="bg-light p-3 mt-2"></pre>
    </details>
</div>

<script>
    // PROTOTYPE ADDITIONS - JS
    // Populate the display elements
    document.getElementById('schemaDisplay').textContent = JSON.stringify(schema, null, 2);
    document.getElementById('startValDisplay').textContent = JSON.stringify(startval, null, 2);
    document.getElementById('editorOptionsDisplay').textContent = JSON.stringify(editorOptions, null, 2);

</script>
<!-- PROTOTYPE ADDITIONS - END -->
`;

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
    const useObjValue = [
        'title',
        'description',
        'default',
        'propertyOrder'
    ];

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