// /* eslint-disable @typescript-eslint/no-explicit-any */
import { inspect } from "util";


 /**
  * logger class to log information to OUTPUT console of vscode window
  * prefer to use logger.debug, but feel free to explore others
  * example: logger.debug('chuck-joke->resp.data', resp.data);
  */
 class Log {
    private _journal: string[] = [];
    // private readonly _logLevel;
    public constructor(level?: LogLevel) {
        // this._logLevel = level | LogLevel.Debug
        this.init();    // used to make it do stuff at initilization for testing
    }

    /**
     * Log collector
     * @param msg debug message to log
     */
    debug(...msg: [unknown, ...unknown[]]): void {
        this.write('DEBUG', ...msg);
    }

    /**
     * Log collector
     * @param msg info message to log
     */
    info(...msg: [unknown, ...unknown[]]): void {
        this.write('INFO', ...msg);
    }
    
    /**
     * Log collector
     * @param msg error message to log
     */
    error(...msg: [unknown, ...unknown[]]): void {
        this.write('ERROR', ...msg);
    }


    write(label: string, ...messageParts: unknown[]): void {
        const message = messageParts.map(this.stringify).join(' ');
        const dateTime = new Date().toISOString();
        this._journal.push(`[${dateTime}] [${label}]: ${message}`);
    }

    /**
     * returns logs as string
     */
    public getLogs(): string[] {
        return this._journal;
    }

    private init(){
        const label = 'DeBuG';
        // const message = 'very special log message';
        const dateTime = new Date();
        const dateT1 = dateTime.toISOString();
        const dateT2 = dateTime.toLocaleString();
        const dateT3 = dateTime.toUTCString();
        this._journal.push(`[${dateT1}] ${label}: 'regular date log message'`);
        this._journal.push(`[${dateT2}] ${label}: 'toLocalString date log message'`);
        this._journal.push(`[${dateT3}] ${label}: 'to UTC date log message'`);
    }

    private stringify(val: unknown): string {
        if (typeof val === 'string') { return val; }
        return inspect(val, {
            colors: false,
            depth: 6, // heuristic
        });
    }
    
}

 enum LogLevel {
    Debug,
    Info,
    Error,
}

const logger = new Log();
export default logger;