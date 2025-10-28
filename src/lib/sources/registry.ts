import { SourceAdapter } from './types';
import { zooplaAdapter } from './adapters/zoopla-uk';
import { rightmoveAdapter } from './adapters/rightmove-uk';
import { realtorAdapter } from './adapters/realtor-us';
import { zillowAdapter } from './adapters/zillow-us';
import { redfinAdapter } from './adapters/redfin-us';
import { immobilienScoutAdapter } from './adapters/immobilien-de';
import { selogerAdapter } from './adapters/seloger-fr';
import { idealistaAdapter } from './adapters/idealista-es';

// Global Source Registry
const adapters: SourceAdapter[] = [
  zooplaAdapter,
  rightmoveAdapter,
  realtorAdapter,
  zillowAdapter,
  redfinAdapter,
  immobilienScoutAdapter,
  selogerAdapter,
  idealistaAdapter,
];

export function getAdapterForUrl(url: string): SourceAdapter | null {
  return adapters.find(adapter => adapter.siteFor(url)) || null;
}

export function getAdapterById(id: string): SourceAdapter | null {
  return adapters.find(adapter => adapter.id === id) || null;
}

export function getAdaptersByRegion(region: string): SourceAdapter[] {
  return adapters.filter(adapter => adapter.region === region);
}

export function getAllAdapters(): SourceAdapter[] {
  return adapters;
}

export function getSupportedRegions(): string[] {
  return Array.from(new Set(adapters.map(a => a.region)));
}
