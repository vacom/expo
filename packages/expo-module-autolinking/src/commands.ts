import chalk from 'chalk';
import commander, { Command } from 'commander';
import process from 'process';

import { findModulesAsync, generateLogs, resolveModulesAsync, verifySearchResults } from '.';
import { SearchOptions, SearchResults } from './types';

registerSearchingCommand('search', async search => {
  console.log(require('util').inspect(search, false, null, true));
});

registerSearchingCommand('resolve', async (search, command) => {
  const modules = await resolveModulesAsync(command.platform, search);

  if (command.json) {
    const logs = generateLogs(search, modules);
    console.log(JSON.stringify({ logs, modules }));
  } else {
    console.log({ modules });
  }
}).option('-j, --json', 'Outputs the results and logs in plain JSON format.', false);

registerSearchingCommand('verify', async search => {
  const logs = verifySearchResults(search);

  if (logs) {
    console.log(logs);
  } else {
    console.log(chalk.green('💪 Duplicated modules not found.'));
  }
});

commander
  .version(require('expo-module-autolinking/package.json').version)
  .description('CLI command that searches for Expo modules to autolink them.')
  .parseAsync(process.argv);

/**
 * Factory for commands that need to search first and shares the same options.
 */
function registerSearchingCommand(
  commandName: string,
  fn: (search: SearchResults, command: Command) => any
) {
  return commander
    .command(`${commandName} [paths...]`)
    .option(
      '-p, --platform [platform]',
      'The platform that the resulted modules must support. Available options: "ios", "android"',
      'ios'
    )
    .option<string[] | null>(
      '-i, --ignore-paths [ignorePaths...]',
      'Paths to ignore when looking up for modules.',
      (value, previous) => (previous ?? []).concat(value),
      null
    )
    .option<string[] | null>(
      '-e, --exclude [exclude...]',
      'Package names to exclude when looking up for modules.',
      (value, previous) => (previous ?? []).concat(value),
      null
    )
    .action(async (searchPaths, command) => {
      const options: SearchOptions = {
        searchPaths,
        ignorePaths: command.ignorePaths,
        exclude: command.exclude,
      };
      const searchResults = await findModulesAsync(command.platform, options);

      return await fn(searchResults, command);
    });
}
