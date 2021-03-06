import { SlotRegistry, Slot } from '@teambit/harmony';
// import { BitCli as CLI, BitCliExt as CLIExtension } from '../cli';
import { ScopeExtension } from '../scope';
import { PackCmd } from './pack.cmd';
import { Packer, PackResult, PackOptions } from './pack';
import { ExtensionDataList } from '../../consumer/config/extension-data';
import ConsumerComponent from '../../consumer/component';
import { Environments } from '../environments';
import { CLIExtension } from '../cli';
import { IsolatorExtension } from '../isolator';

export interface PackageJsonProps {
  [key: string]: any;
}

export type PackageJsonPropsRegistry = SlotRegistry<PackageJsonProps>;

export type PkgExtensionConfig = {};

/**
 * Config for variants
 */
export type ComponentPkgExtensionConfig = {
  /**
   * properties to add to the package.json of the component.
   */
  packageJson: Record<string, any>;
};

export class PkgExtension {
  static id = '@teambit/pkg';
  static dependencies = [CLIExtension, ScopeExtension, Environments, IsolatorExtension];
  static slots = [Slot.withType<PackageJsonProps>()];
  static defaultConfig = {};

  static provider(
    [cli, scope, envs, isolator]: [CLIExtension, ScopeExtension, Environments, IsolatorExtension],
    config: PkgExtensionConfig,
    [packageJsonPropsRegistry]: [PackageJsonPropsRegistry]
  ) {
    const packer = new Packer(isolator, scope?.legacyScope);
    const pkg = new PkgExtension(config, packageJsonPropsRegistry, packer, envs);
    // TODO: maybe we don't really need the id here any more
    ConsumerComponent.registerAddConfigAction(PkgExtension.id, pkg.mergePackageJsonProps.bind(pkg));
    // TODO: consider passing the pkg instead of packer
    cli.register(new PackCmd(packer));

    return pkg;
  }

  /**
   *Creates an instance of PkgExtension.
   * @param {PkgExtensionConfig} config
   * @param {PackageJsonPropsRegistry} packageJsonPropsRegistry
   * @param {Packer} packer
   * @memberof PkgExtension
   */
  constructor(
    /**
     * pkg extension configuration.
     */
    readonly config: PkgExtensionConfig,

    /**
     * Registry for changes by other extensions.
     */
    private packageJsonPropsRegistry: PackageJsonPropsRegistry,

    /**
     * A utils class to packing components into tarball
     */
    private packer: Packer,

    /**
     * envs extension.
     */
    private envs: Environments
  ) {}

  /**
   * register changes in the package.json
   */
  registerPackageJsonNewProps(props: PackageJsonProps): void {
    return this.packageJsonPropsRegistry.register(props);
  }

  /**
   * Pack a component and generate a tarball suitable for npm registry
   *
   * @param {string} componentId
   * @param {(string | undefined)} scopePath
   * @param {string} outDir
   * @param {boolean} [prefix=false]
   * @param {boolean} [override=false]
   * @param {boolean} [keep=false]
   * @returns {Promise<PackResult>}
   * @memberof PkgExtension
   */
  async packComponent(componentId: string, scopePath: string | undefined, options: PackOptions): Promise<PackResult> {
    return this.packer.packComponent(componentId, scopePath, options);
  }

  /**
   * Merge the configs provided by:
   * 1. envs configured in the component - via getPackageJsonProps method
   * 2. extensions that registered to the registerPackageJsonNewProps slot (and configured for the component)
   * 3. props defined by the user (they are the strongest one)
   * @param configuredExtensions
   */
  async mergePackageJsonProps(configuredExtensions: ExtensionDataList): Promise<PackageJsonProps> {
    let newProps = {};
    const env = this.envs.getEnvFromExtensions(configuredExtensions);
    if (env?.getPackageJsonProps && typeof env.getPackageJsonProps === 'function') {
      const propsFromEnv = await env.getPackageJsonProps();
      newProps = Object.assign(newProps, propsFromEnv);
    }
    const configuredIds = configuredExtensions.ids;
    configuredIds.forEach(extId => {
      // Only get props from configured extensions on this specific component
      const props = this.packageJsonPropsRegistry.get(extId);
      if (props) {
        newProps = Object.assign(newProps, props);
      }
    });
    const currentExtension = configuredExtensions.findExtension(PkgExtension.id);
    const currentConfig = (currentExtension?.config as unknown) as ComponentPkgExtensionConfig;
    if (currentConfig && currentConfig.packageJson) {
      newProps = Object.assign(newProps, currentConfig.packageJson);
    }
    return newProps;
  }
}
