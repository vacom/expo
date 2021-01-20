import chalk from 'chalk';
import Table from 'cli-table3';
import glob from 'fast-glob';
import findUp from 'find-up';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  AutolinkingPlatform,
  ModuleDescriptor,
  PackageRevision,
  SearchOptions,
  SearchResults,
} from './types';

/**
 * Resolves autolinking search paths. If none is provided, it accumulates all node_modules when
 * going up through the path components. This makes workspaces work out-of-the-box without any configs.
 */
export async function resolveSearchPathsAsync(
  searchPaths: string[] | null,
  cwd: string
): Promise<string[]> {
  return searchPaths && searchPaths.length > 0
    ? searchPaths.map(searchPath => path.resolve(cwd, searchPath))
    : await findDefaultPathsAsync(cwd);
}

/**
 * Finds project's package.json and returns its path.
 */
export async function findPackageJsonPathAsync(): Promise<string | null> {
  return (await findUp('package.json', { cwd: process.cwd() })) ?? null;
}
/**
 * Looks up for workspace's `node_modules` paths.
 */
export async function findDefaultPathsAsync(cwd: string): Promise<string[]> {
  const paths = [];
  let dir = cwd;
  let pkgJsonPath: string | undefined;

  while ((pkgJsonPath = await findUp('package.json', { cwd: dir }))) {
    dir = path.dirname(path.dirname(pkgJsonPath));
    paths.push(path.join(pkgJsonPath, '..', 'node_modules'));
  }
  return paths;
}

/**
 * Searches for modules to link based on given config.
 */
export async function findModulesAsync(
  platform: AutolinkingPlatform,
  providedOptions: SearchOptions
): Promise<SearchResults> {
  const config = await mergeLinkingOptionsAsync(platform, providedOptions);
  const results: SearchResults = {};

  for (const searchPath of config.searchPaths) {
    const paths = await glob('**/unimodule.json', {
      cwd: searchPath,
    });

    for (const packageConfigPath of paths) {
      // const packagePath = fs.realpathSync(path.join(searchPath, path.dirname(moduleConfigPath)));
      const packagePath = path.join(searchPath, path.dirname(packageConfigPath));
      const packageConfig = require(path.join(packagePath, 'unimodule.json'));
      const { name, version } = require(path.join(packagePath, 'package.json'));

      if (config.exclude?.includes(name) || !packageConfig.platforms?.includes(platform)) {
        continue;
      }

      const currentRevision: PackageRevision = {
        path: packagePath,
        version,
      };

      if (!results[name]) {
        // The revision that was found first will be the main one.
        // An array of duplicates is needed only here.
        results[name] = { ...currentRevision, duplicates: [] };
      } else if (results[name].duplicates?.every(({ path }) => path !== packagePath)) {
        results[name].duplicates?.push(currentRevision);
      }
    }
  }
  return results;
}

/**
 * Merges autolinking options from different sources (the later the higher priority)
 * - options defined in package.json's `expoModules` field
 * - platform-specific options from the above (e.g. `expoModules.ios`)
 * - options provided to the CLI command
 */
export async function mergeLinkingOptionsAsync(
  platform: AutolinkingPlatform,
  providedOptions: SearchOptions
): Promise<SearchOptions> {
  const packageJsonPath = await findPackageJsonPathAsync();
  const packageJson = packageJsonPath ? require(packageJsonPath) : {};
  const baseOptions = packageJson.expo?.autolinking;
  const platformOptions = baseOptions?.[platform];
  const allOptions: Partial<SearchOptions>[] = [providedOptions, platformOptions, baseOptions];

  function pickMergedValue<T extends keyof SearchOptions>(key: T): SearchOptions[T] | null {
    for (const obj of allOptions) {
      if (obj?.[key]) {
        return obj[key]!;
      }
    }
    return null;
  }

  return {
    searchPaths: await resolveSearchPathsAsync(pickMergedValue('searchPaths'), process.cwd()),
    ignorePaths: pickMergedValue('ignorePaths'),
    exclude: pickMergedValue('exclude'),
  };
}

/**
 * Verifies the search results and then returns logs string, but doesn't print it yet.
 * Right now it only checks whether there are no duplicates.
 */
export function verifySearchResults(searchResults: SearchResults): string {
  const cwd = process.cwd();
  const relativePath: (pkg: PackageRevision) => string = pkg => path.relative(cwd, pkg.path);
  const table = new Table();

  for (const moduleName in searchResults) {
    const moduleResult = searchResults[moduleName];

    if (moduleResult.duplicates?.length) {
      const duplicates = moduleResult.duplicates;
      const paths = [
        chalk.magenta(relativePath(moduleResult)),
        ...duplicates.map(duplicate => chalk.gray(relativePath(duplicate))),
      ];
      const versions = [
        chalk.cyan(moduleResult.version),
        ...duplicates.map(duplicate => chalk.gray(duplicate.version)),
      ];

      table.push(
        [
          {
            colSpan: 2,
            content: `${chalk.green(moduleName)} has been found at multiple directories`,
          },
        ],
        [paths.join(os.EOL), versions.join(os.EOL)]
      );
    }
  }
  if (table.length > 0) {
    return [
      table.toString(),
      chalk.yellow(
        `⚠️  Found ${table.length / 2} duplicated module(s), but only the first one will be used.`
      ),
      chalk.yellow(
        '⚠️  Make sure to get rid of unnecessary versions as it may introduce some side effects.'
      ),
    ].join(os.EOL);
  }
  return '';
}

/**
 * Generates logs to print during linking.
 */
export function generateLogs(search: SearchResults, modules: ModuleDescriptor[]): string {
  const logs = [
    chalk.bold('Using Expo modules:'),

    ...Object.entries(search).map(([packageName, revision]) => {
      return `- ${chalk.green(packageName)} (${chalk.cyan(revision.version)})`;
    }),

    verifySearchResults(search),
  ];
  return logs.join(os.EOL);
}

/**
 * Resolves search results to a list of platform-specific configuration.
 */
export async function resolveModulesAsync(
  platform: string,
  searchResults: SearchResults
): Promise<ModuleDescriptor[]> {
  const platformLinking = require(`./resolvers/${platform}`);

  return (
    await Promise.all(
      Object.entries(searchResults).map(([packageName, revision]) =>
        platformLinking.resolveModuleAsync(packageName, revision)
      )
    )
  ).filter(Boolean);
}
