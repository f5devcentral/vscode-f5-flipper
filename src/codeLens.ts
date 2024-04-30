


import path from 'path';
import {
    CodeLens,
    CodeLensProvider,
    Range,
    TextDocument,
    EventEmitter as VsEventEmitter,
    Event as VsEvent,
    workspace
} from "vscode";






export class NsCodeLensProvider implements CodeLensProvider {

    private _onDidChangeCodeLenses: VsEventEmitter<void> = new VsEventEmitter<void>();
    public readonly onDidChangeCodeLenses: VsEvent<void> = this._onDidChangeCodeLenses.event;

    constructor() {

        workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {

        const codeLens: CodeLens[] = [];

        const firstLine = new Range(0, 0, 0, 0);
        const secondLine = new Range(1, 0, 0, 0);

        const justFileName = path.parse(document.fileName).base;

        if(justFileName === 'diagnostics.json') {

            codeLens.push(
                new CodeLens(
                    firstLine,
                    {
                        command: 'workbench.action.files.save',
                        title: '--- SAVE ---',
                        tooltip: 'Click to save diagnostic rules',
                    }
                )
            );

        } else if(document.fileName === 'app.ns.json') {
            // if document.name === 'app.ns.conf'

            // find the editor -> get first line of text and abstract the appName

            // then get app json to feed into codeLens action (convert2XC/convert2AS3/convert2NX)

            // decided to just pass the document reference and abstract whats needed later

            // end goal should be to pass the app name and get the app config as needed

            codeLens.push(
                new CodeLens(
                    secondLine,
                    {
                        command: 'f5-flipper.convert2XC',
                        title: 'Convert to XC',
                        tooltip: 'click to convert to XC',
                        arguments: [document]
                    }
                )
            );
            
            codeLens.push(
                new CodeLens(
                    secondLine,
                    {
                        command: 'f5-flipper.convert2AS3',
                        title: 'Convert to AS3',
                        tooltip: 'click to convert to AS3',
                        arguments: [{document, template: 'ns/http'}]
                    }
                )
            );

            codeLens.push(
                new CodeLens(
                    secondLine,
                    {
                        command: 'f5-flipper.convert2NX',
                        title: 'Convert to NGINX',
                        tooltip: 'click to convert to NGINX',
                        arguments: [document]
                    }
                )
            );

        }

        return codeLens;
    }
}