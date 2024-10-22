import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts
 */
export default class DataviewAdapter implements Adapter {

    private functions: AdapterFunction[] = [
        {
            function: this.evaluate,
            label: "Dataview expression",
            description: "Equivalent to running evaluateInline()",
            parameters: [
                { parameter: 'expression', label: "Dataview expression", description: "Dataview expression to evaluate.", type: 'text', required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Use a Note Toolbar Callout with a unique meta field (in place of styles) to put text output. This will be empty if your script does not return a value.", type: 'text', required: false }
            ]
        },
        {
            function: this.executeJs,
            label: "Dataview JS expression",
            description: "Execute a JavaScript expression",
            parameters: [
                { parameter: 'expression', label: "Dataview JS expression",  description: "Dataview JS expression to evaluate.", type: 'text', required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", type: 'text', required: false }
            ]
        },
        {
            function: this.exec,
            label: "Script",
            description: "This is similar to running dv.view()",
            parameters: [
                { parameter: 'sourceFile', label: "Script file", description: "Dataview JS file to execute.", type: 'file', required: true },
                { parameter: 'sourceArgs', label: "Arguments (optional)", type: 'text', description: "Parameters for your script in JSON format.", required: false },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", type: 'text', required: false }
            ]
        },
        {
            function: this.query,
            label: "Query",
            description: "Run a Dataview query",
            parameters: [
                { parameter: 'expression', label: "Query", type: 'text', description: "Dataview query to evaluate.", required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", type: 'text', required: false }
            ]
        }
    ];

    private plugin: NoteToolbarPlugin | null;
    private dataviewPlugin: any | null;
    private dataviewApi: any | null;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.dataviewPlugin = (plugin.app as any).plugins.plugins["dataview"];
        this.dataviewApi = this.dataviewPlugin.api;
    }

    disable() {
        this.dataviewApi = null;
        this.dataviewPlugin = null;
        this.plugin = null;
    }

    getFunctions(): AdapterFunction[] {
        return this.functions;
    }

    async use(config: ScriptConfig): Promise<string | void> {
        
        let result;

        let containerEl;
        if (config.outputContainer) {
            containerEl = this.plugin?.getScriptOutputEl(config.outputContainer);
            if (!containerEl) {
                new Notice(`Error: Could not find callout in current note with ID: ${config.outputContainer}`, 5000);
                return;
            }
        }

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl)
                    : `Error: ${config.pluginFunction}: Expression is required`;
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, config.sourceArgs, containerEl)
                    : `Error: ${config.pluginFunction}: Script file is required`;
                break;
            case 'executeJs':
                result = config.expression
                    ? await this.executeJs(config.expression, containerEl)
                    : `Error: ${config.pluginFunction}: Expression is required`;
                break;
            case 'query':
                result = config.expression
                    ? await this.query(config.expression, containerEl)
                    : `Error: ${config.pluginFunction}: Expression is required`;
                break;
            default:
                result = `Unsupported function: ${config.pluginFunction}`;
                break;
        }

        return result;

    }

    /**
     * @example
     * 2 + 6
     * @example
	 * date(today)
     * @example
	 * dateformat(this.file.mtime, "yyyy.MM.dd - HH:mm")
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async evaluate(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        
        const activeFile = this.plugin?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path;

        const component = new Component();
		component.load();
        try {
            if (this.dataviewApi) {
                debugLog("evaluate: " + expression);
                let dvResult = await (this.dataviewApi as any).evaluateInline(expression, activeFile?.path);
                debugLog("evaluate: result:", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    await this.dataviewApi.renderValue(
                        dvResult.value,
                        containerEl,
                        component,
                        activeFilePath
                    );
                }
                else {
                    result = dvResult.successful ? dvResult.value : '```\n' + dvResult.error + '```';
                }
            }
        }
        catch (error) {
            this.displayError(`Failed to evaluate expression: ${expression}\nDataview error:`, error, containerEl);
            result = "Dataview error: Check console for more details.\n```\n' + error + '```";
        }
        finally {
            component.unload();
        }

        return result;

    }

    /**
     * Adaptation of dv.view(). This version does not support CSS.
     * @example
     * Scripts/HelloWorld.js // script has no function
     * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/inline-api.ts
     */
    private async exec(filename: string, argsJson?: string, containerEl?: HTMLElement) {

        if (!filename) {
            return;
        }

        let args;
        try {
            args = argsJson ? JSON.parse(argsJson) : {};
        }
        catch (error) {
            this.displayError(`Failed to parse arguments for script: ${filename}\nError:`, error, containerEl);
            return;
        }
        
        // TODO: this works if the script doesn't need a container... but where does this span go?
        containerEl = containerEl ? containerEl : createSpan();

        const activeFile = this.plugin?.app.workspace.getActiveFile();
        if (!activeFile) {
            debugLog("view: We're not in a file");
            return;
        }
        const activeFilePath = activeFile.path;

        let viewFile = this.plugin?.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!viewFile) {
            // TODO: render messages into the container, if provided
            // debugLog(container, `view: custom view not found for '${simpleViewPath}' or '${complexViewPath}'.`);
            debugLog(`view: script file not found: ${filename}`);
            return;
        }

        let contents = await this.plugin?.app.vault.read(viewFile);
        if (contents) {
            if (contents.contains("await")) contents = "(async () => { " + contents + " })()";
            contents += `\n//# sourceURL=${viewFile.path}`;
            let func = new Function("dv", "input", contents);
         // FIXME? component is too short-lived; using this.plugin instead, but might lead to memory leaks? thread:
         // https://discord.com/channels/686053708261228577/840286264964022302/1296883427097710674
         // "then you need to hold on to your component longer and call unload when you want to get rid of the element"
         const component = new Component();
         component.load();
         try {
             containerEl.empty();
             let dataviewLocalApi = this.dataviewPlugin.localApi(activeFile.path, this.plugin, containerEl);    
             // from dv.view: may directly render, in which case it will likely return undefined or null
             // TODO: try: args should be provided as a string that's read in as JSON; note other script types need to support this as well
             let result = await Promise.resolve(func(dataviewLocalApi, args));
             if (result && this.plugin) {
                 await this.dataviewApi.renderValue(
                     this.plugin.app,
                     result as any,
                     containerEl,
                     activeFilePath,
                     component,
                     this.dataviewApi.settings,
                     true
                 );
             }
         }
         catch (error) {
             this.displayError(`Failed to execute script: ${viewFile.path}\nError:`, error, containerEl);
         }
         finally {
             component.unload();
         }

        }

    }

    /**
     * @example
     * dv.el('p', dv.current().file.mtime)
     * @example
	 * console.log(dv.current().file.mtime)
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async executeJs(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        let resultEl = containerEl ? containerEl : document.createElement('div');

        const activeFile = this.plugin?.app.workspace.getActiveFile();

        const component = new Component();
        component.load();
        try {
            if (this.dataviewApi) {
                debugLog("executeJs: ", expression);
                await (this.dataviewApi as any).executeJs(expression, resultEl, component, activeFile?.path);
                debugLog("executeJs: result:", resultEl);
                if (!containerEl) {
                    const errorEl = resultEl.querySelector('.dataview-error');
                    if (errorEl) {
                        throw new Error(errorEl.textContent ?? undefined);
                    }
                    else if (resultEl.children.length === 0 && resultEl.textContent?.trim() === '') {
                        // nothing was returned; do nothing? may depend on what user wants to do
                        debugLog('executeJs: no result');
                        result = '';
                    }
                    else {
                        result = resultEl.textContent ? resultEl.textContent : '';
                    }
                }
            }
        }
        catch (error) {
            this.displayError(`Failed to evaluate expression: ${expression}\nDataview error:`, error, containerEl);
        }
        finally {
            component.unload();
        }

        return result;

    }

    /**
     * Runs the given Dataview query, returning the output from the Dataview API: queryMarkdown
     * If a container is provided, it renders the resulting markdown to the given container.
     * @example
     * TABLE file.mtime AS "Last Modified" FROM "Demos" SORT file.mtime DESC
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async query(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        const activeFile = this.plugin?.app.workspace.getActiveFile();

        if (!activeFile) {
            return `Dataview Adapter (query): A file must be open to run this query.`;
        }

        const component = new Component();
        component.load();
        try {
            if (this.dataviewApi) {
                debugLog("query: " + expression);
                // returns a Promise<Result<QueryResult, string>>
                let dvResult = await (this.dataviewApi as any).queryMarkdown(expression, activeFile, this.dataviewApi.settings);
                // TODO: is there a chance result is empty/undefined? what to do in that case?
                debugLog("query: result: ", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    if (this.plugin) {
                        MarkdownRenderer.render(
                            this.plugin.app,
                            dvResult.successful ? dvResult.value : dvResult.error,
                            containerEl,
                            activeFile.path,
                            component
                        );
                    }
                }
                else {
                    result = dvResult.successful ? dvResult.value : '```\n' + dvResult.error + '```';
                }
            }
        }
        catch (error) {
            this.displayError(`Failed to evaluate query: ${expression}\nDataview error:`, error, containerEl);
            result = 'Dataview error: Check console for more details.\n```\n' + error + '```';
        }
        finally {
			component.unload();
		}

        return result;

    }

    private displayError(message: string, error?: any, containerEl?: HTMLElement) {
        console.error(message, error);
        if (containerEl) {
            let errorEl = containerEl.createEl('pre');
            errorEl.addClass('dataview', 'dataview-error');
            errorEl.setText(message + '\n' + error);
        }
    }

}