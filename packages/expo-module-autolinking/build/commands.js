"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = __importDefault(require("commander"));
const process_1 = __importDefault(require("process"));
const _1 = require(".");
registerSearchingCommand('search', async (search) => {
    console.log(require('util').inspect(search, false, null, true));
});
registerSearchingCommand('resolve', async (search, command) => {
    const modules = await _1.resolveModulesAsync(command.platform, search);
    if (command.json) {
        const logs = _1.generateLogs(search, modules);
        console.log(JSON.stringify({ logs, modules }));
    }
    else {
        console.log({ modules });
    }
}).option('-j, --json', 'Outputs the results and logs in plain JSON format.', false);
registerSearchingCommand('verify', async (search) => {
    const logs = _1.verifySearchResults(search);
    if (logs) {
        console.log(logs);
    }
    else {
        console.log(chalk_1.default.green('💪 Duplicated modules not found.'));
    }
});
commander_1.default
    .version(require('expo-module-autolinking/package.json').version)
    .description('CLI command that searches for Expo modules to autolink them.')
    .parseAsync(process_1.default.argv);
/**
 * Factory for commands that need to search first and shares the same options.
 */
function registerSearchingCommand(commandName, fn) {
    return commander_1.default
        .command(`${commandName} [paths...]`)
        .option('-p, --platform [platform]', 'The platform that the resulted modules must support. Available options: "ios", "android"', 'ios')
        .option('-i, --ignore-paths [ignorePaths...]', 'Paths to ignore when looking up for modules.', (value, previous) => (previous ?? []).concat(value), null)
        .option('-e, --exclude [exclude...]', 'Package names to exclude when looking up for modules.', (value, previous) => (previous ?? []).concat(value), null)
        .action(async (searchPaths, command) => {
        const options = {
            searchPaths,
            ignorePaths: command.ignorePaths,
            exclude: command.exclude,
        };
        const searchResults = await _1.findModulesAsync(command.platform, options);
        return await fn(searchResults, command);
    });
}
//# sourceMappingURL=commands.js.map