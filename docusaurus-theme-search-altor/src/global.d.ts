declare module '@docusaurus/useDocusaurusContext' {
  export default function useDocusaurusContext(): any;
}

declare module '@docusaurus/Link' {
  import React from 'react';
  const Link: React.FC<any>;
  export default Link;
}

declare module '@theme/Layout' {
  import React from 'react';
  const Layout: React.FC<any>;
  export default Layout;
}

declare module '@docusaurus/router' {
  export function useHistory(): any;
  export function useLocation(): any;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module 'altor-vec' {
  export default function init(): Promise<void>;
  export class WasmSearchEngine {
    constructor(index: Uint8Array);
    search(query: Float32Array, limit: number): { id: number; score: number }[];
  }
}

declare module 'react-dom' {
  export function createPortal(children: React.ReactNode, container: Element | DocumentFragment, key?: null | string): React.ReactPortal;
}
