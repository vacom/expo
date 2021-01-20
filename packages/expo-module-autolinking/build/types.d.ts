export declare type AutolinkingPlatform = 'ios' | 'android';
export declare type SearchOptions = {
    searchPaths: string[];
    ignorePaths?: string[] | null;
    exclude?: string[] | null;
};
export declare type PackageRevision = {
    path: string;
    version: string;
    duplicates?: PackageRevision[];
};
export declare type SearchResults = {
    [moduleName: string]: PackageRevision;
};
export declare type ModuleDescriptor = Record<string, any>;
