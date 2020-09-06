import type { ComponentUI } from '@teambit/component';
import { ComponentAspect } from '@teambit/component';
import { Slot } from '@teambit/harmony';
import { RouteSlot } from '@teambit/react-router';
import { SidebarAspect, SidebarUI } from '@teambit/sidebar';
import { UIAspect, UIRootUI as UIRoot, UIRuntime, UiUI } from '@teambit/ui';
import React from 'react';
import { RouteProps } from 'react-router-dom';

import { ScopeAspect } from './scope.aspect';
import { Scope } from './ui/scope';

export type MenuItem = {
  label: JSX.Element | string | null;
};

export class ScopeUI {
  constructor(
    /**
     * route slot.
     */
    private routeSlot: RouteSlot,

    /**
     * component ui extension.
     */
    private componentUi: ComponentUI,
    /**
     * menu slot
     */
    private menuSlot: RouteSlot,
    private sidebar: SidebarUI
  ) {
    this.registerExplicitRoutes();
  }

  /**
   * register a route to the scope.
   */
  registerRoute(route: RouteProps) {
    this.routeSlot.register(route);
    return this;
  }

  listComponents() {
    throw new Error('not implemented!');
    return undefined;
  }

  private registerExplicitRoutes() {
    this.routeSlot.register({
      path: this.componentUi.routePath,
      children: this.componentUi.getComponentUI(ScopeAspect.id),
    });

    this.menuSlot.register({
      path: this.componentUi.routePath,
      children: this.componentUi.getMenu(ScopeAspect.id),
    });
  }

  get root(): UIRoot {
    return {
      routes: [
        {
          path: '/',
          children: <Scope routeSlot={this.routeSlot} menuSlot={this.menuSlot} sidebar={<this.sidebar.render />} />,
        },
      ],
    };
  }

  static dependencies = [UIAspect, ComponentAspect, SidebarAspect];

  static runtime = UIRuntime;

  static slots = [Slot.withType<RouteProps>(), Slot.withType<RouteProps>()];

  static async provider(
    [ui, componentUi, sidebar]: [UiUI, ComponentUI, SidebarUI],
    config,
    [routeSlot, menuSlot]: [RouteSlot, RouteSlot]
  ) {
    const scopeUi = new ScopeUI(routeSlot, componentUi, menuSlot, sidebar);
    ui.registerRoot(scopeUi.root);

    return scopeUi;
  }
}

export default ScopeUI;

ScopeAspect.addRuntime(ScopeUI);
