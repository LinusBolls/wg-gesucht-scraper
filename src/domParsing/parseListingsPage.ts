import { parse as parseHtml, HTMLElement } from 'node-html-parser';

import { ListingPreviewData } from '../types/Listing';
import {
  normalizeWhitespace,
  parseDateRange,
  parseEuros,
  parseSquareMeters,
  parseWggAssetIdFromUrl,
} from '../utils/stringParsing';

const assertNode = (
  parent: HTMLElement,
  el: HTMLElement | null,
  name: string
) => {
  if (el == null) {
    throw new Error(
      `'${name}' element not found inside parent: ${parent.toString()}`
    );
  }
  return el;
};

function parsePartneredListingCard(listingCard: HTMLElement) {
  return {};
}
function parseListingCard(listingCard: HTMLElement): ListingPreviewData {
  const titleEl = assertNode(
    listingCard,
    listingCard.querySelector('h3.truncate_title a'),
    'title'
  );

  const descEl = assertNode(
    listingCard,
    listingCard.querySelector('.card_body .row .col-xs-11 span'),
    'description'
  );

  const priceEl = assertNode(
    listingCard,
    listingCard.querySelector('.row.middle > :nth-child(1) b'),
    'price'
  );

  const dateEl = assertNode(
    listingCard,
    listingCard.querySelector('.row.middle > .text-center:nth-child(2)'),
    'date'
  );

  const spaceEl = assertNode(
    listingCard,
    listingCard.querySelector('.row.middle > :nth-child(3) b'),
    'space'
  );

  const verifiedCompanyEl = listingCard.querySelector('.label_verified');

  const isCompanyListing = verifiedCompanyEl != null;

  const title = normalizeWhitespace(titleEl.innerText)!;

  const shortDesc = normalizeWhitespace(descEl.innerText)!;

  const totalRentEur = parseEuros(priceEl.innerText)!;

  const spaceSquareMeters = parseSquareMeters(spaceEl.innerText);

  const dateRange = normalizeWhitespace(dateEl.innerText);

  const { startDate, endDate } = parseDateRange(dateRange!);

  const url = 'https://www.wg-gesucht.de' + titleEl.getAttribute('href');

  const id = parseWggAssetIdFromUrl(url);

  return {
    id,
    url,
    title,
    shortDesc,
    costs: {
      totalRentEur,
    },
    spaceSquareMeters,
    startDate,
    endDate,
    isCompanyListing,
  };
}

export default function parseListingsPage(listingsPageHtmlStr: string) {
  const listingsPage = parseHtml(listingsPageHtmlStr);

  const partneredListingEls = listingsPage.querySelectorAll(
    '.wgg_card.clicked_partner'
  );
  const listingEls = listingsPage.querySelectorAll(
    '.wgg_card:not(.clicked_partner)'
  );

  if (listingEls.length === 0) {
    throw new Error(
      "FATAL captcha solving required: 'https://www.wg-gesucht.de/cuba.html?page=/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html'"
    );
  }
  const partneredListings = partneredListingEls.map(parsePartneredListingCard);

  const listings = listingEls.map(parseListingCard);

  return {
    partneredListings,
    listings,
  };
}
