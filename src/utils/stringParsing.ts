import { parse as parseUrl } from 'url';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayjs from 'dayjs';

dayjs.extend(customParseFormat);

import { ListingPublisher } from '../types/Listing';

export const normalizeWhitespace = (str: string | null) =>
  typeof str === 'string' ? str.trim().replace(/\s+/g, ' ') : null;

export const parseEuros = (str: string | null) =>
  typeof str === 'string'
    ? parseInt(normalizeWhitespace(str)!.replace(' &euro;', ''))
    : null;

export const parseSquareMeters = (str: string | null) =>
  typeof str === 'string'
    ? parseInt(normalizeWhitespace(str)!.replace(' m&sup2;', ''))
    : null;

export const parseDate = (str: string | null) =>
  typeof str === 'string' ? normalizeWhitespace(str)! : null;

/**
 * @example '01.01.1970'
 * @example '01.01.1970 - 01.01.2000'
 */
export const parseDateRange = (date: string) => {
  if (typeof date !== 'string') return { startDate: null, endDate: null };

  const [rawStartDate = null, rawEndDate = null] = date.split(' - ');

  const startDate = dayjs(rawStartDate, 'DD.MM.YYYY').toDate();
  const endDate = dayjs(rawEndDate, 'DD.MM.YYYY').toDate();

  return { startDate, endDate };
};

/**
 * @example 'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html?asset_id=9791250&pu=12685206&sort_column=4&sort_order=0'
 * @example 'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.9797145.html'
 */
export const parseWggAssetIdFromUrl = (url: string) => {
  const urlData = parseUrl(url, true);

  const queryParam = urlData.query.asset_id as string | undefined;

  const pathParam = urlData.pathname?.match(/\.(\d+)\.html$/)?.[1]!;

  return queryParam ?? pathParam;
};

export const parseName = (raw: string): ListingPublisher['name'] => {
  if (raw == null)
    return {
      raw,
      first: null,
      last: null,
      title: null,
      recommended: null,
      gender: 'UNKNOWN',
    };

  const parts = normalizeWhitespace(raw)!.split(' ');

  // @ts-ignore
  for (const [idx, part] of parts.entries()) {
    if (/^(frau|mrs|miss|madam)/i.test(part)) {
      return {
        raw,
        first: null,
        last: parts.slice(idx + 1).join(' '),
        title: part,
        recommended: parts.slice(idx).join(' '),
        gender: 'FEMALE',
      };
    }
    if (/^(herr|mr)/i.test(part)) {
      return {
        raw,
        first: null,
        last: parts.slice(idx + 1).join(' '),
        title: part,
        recommended: parts.slice(idx).join(' '),
        gender: 'MALE',
      };
    }
  }
  return {
    raw,
    first: parts[0] ?? null,
    last: parts[1] ?? null,
    title: null,
    recommended: parts[0] ?? null,
    gender: 'UNKNOWN',
  };
};
