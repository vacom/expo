import { ModuleDescriptor, PackageRevision } from '../types';
/**
 * Resolves module search result with additional details required for iOS platform.
 */
export declare function resolveModuleAsync(packageName: string, revision: PackageRevision): Promise<ModuleDescriptor | null>;
