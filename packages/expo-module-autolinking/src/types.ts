export type AutolinkingPlatform = 'ios' | 'android';

export type SearchOptions = {
  searchPaths: string[];
  ignorePaths?: string[] | null;
  exclude?: string[] | null;
};

export type PackageRevision = {
  path: string;
  version: string;
  duplicates?: PackageRevision[];
};

export type SearchResults = {
  [moduleName: string]: PackageRevision;
};

export type ModuleDescriptor = Record<string, any>;
