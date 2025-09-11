declare module "./cache" {
  export function getCache(key: string): any;
  export function setCache(key: string, value: any): void;
} 