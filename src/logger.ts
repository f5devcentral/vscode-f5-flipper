'use strict';

import Logger from 'f5-conx-core/dist/logger';


/**
 * the whole point of this logger file is to instantiate a unique logger instance and return the singleton instance for the rest of the extension
 * 
 * This allows for another unique instance to be used for other extensions
 * 
 * https://stackoverflow.com/questions/30174078/how-to-define-singleton-in-typescript
 * 
 * 
 */

export const logger = new Logger('F5_VSCODE_FLIPPER_LOG_LEVEL');
// export const logger = loggerInst;