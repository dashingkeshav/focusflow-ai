// Custom type definitions for FocusFlow AI
declare module 'next' {
  export interface Metadata {
    title?: string | { default: string; template: string };
    description?: string;
    keywords?: string | string[];
    icons?: any;
    openGraph?: any;
    twitter?: any;
    robots?: any;
    [key: string]: any;
  }
  export interface Viewport {
    themeColor?: string | { media: string; color: string }[];
    width?: string | number;
    initialScale?: number;
    maximumScale?: number;
    userScalable?: boolean;
    colorScheme?: 'dark' | 'light' | 'normal';
    [key: string]: any;
  }
  export namespace MetadataRoute {
    export type Robots = {
      rules: { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[]; crawlDelay?: number } | { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[]; crawlDelay?: number }[];
      sitemap?: string | string[];
      host?: string;
    };
    export type Sitemap = {
      url: string;
      lastModified?: string | Date;
      changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
      priority?: number;
      alternates?: any;
    }[];
  }
  export type NextConfig = Record<string, any>;
}

declare module 'next/script' {
  import React, { ComponentProps } from 'react';
  export interface ScriptProps extends ComponentProps<'script'> {
    strategy?: 'afterInteractive' | 'beforeInteractive' | 'lazyOnload' | 'worker';
    onLoad?: (e: any) => void;
    onReady?: () => void;
    onError?: (e: any) => void;
    children?: React.ReactNode;
  }
  const Script: React.FC<ScriptProps>;
  export default Script;
}

declare module 'next/link' {
  import React, { ComponentProps } from 'react';
  export interface LinkProps extends Omit<ComponentProps<'a'>, 'href'> {
    href: string | { pathname?: string; query?: any; hash?: string };
    replace?: boolean;
    scroll?: boolean;
    prefetch?: boolean;
    passHref?: boolean;
    shallow?: boolean;
    children?: React.ReactNode;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}

declare module 'next/navigation' {
  export function usePathname(): string;
  export function useRouter(): {
    push(href: string, options?: any): void;
    replace(href: string, options?: any): void;
    prefetch(href: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
  };
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = any>(): T;
  export function redirect(url: string, type?: any): never;
  export function notFound(): never;
}

declare module 'next/image' {
  import React, { ComponentProps } from 'react';
  export interface ImageProps extends Omit<ComponentProps<'img'>, 'src' | 'alt'> {
    src: string | any;
    alt: string;
    width?: number | string;
    height?: number | string;
    fill?: boolean;
    loader?: any;
    quality?: number | string;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    unoptimized?: boolean;
    sizes?: string;
    className?: string;
  }
  const Image: React.FC<ImageProps>;
  export default Image;
}

declare module 'next/server' {
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static next(init?: any): NextResponse;
  }
  export interface NextRequest extends Request {
    nextUrl: URL;
    cookies: any;
  }
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type Metadata = any;
  export type ResolvedMetadata = any;
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module 'next/dist/build/segment-config/app/app-segment-config.js' {
  export type AppSegmentConfig = any;
  export type InstantConfigForTypeCheckInternal = any;
  export type Prefetch = any;
}

declare module 'next/server.js' {
  export * from 'next/server';
}

declare module 'next/types.js' {
  export type Route = any;
  export type ParamValue = any;
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module 'framer-motion' {
  import React from 'react';
  export const motion: any;
  export const AnimatePresence: React.FC<{ children?: React.ReactNode; mode?: 'wait' | 'sync' | 'popLayout'; initial?: boolean; onExitComplete?: () => void }>;
  export const useMotionValue: any;
  export const useTransform: any;
  export const useSpring: any;
  export const useScroll: any;
  export const useInView: any;
  export const useAnimation: any;
  export const useReducedMotion: () => boolean | null;
  export const useMotionTemplate: any;
  export const useMotionValueEvent: any;
  export const animate: any;
}
