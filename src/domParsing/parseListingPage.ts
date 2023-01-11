import dayjs from 'dayjs';
import { parse as parseHtml } from 'node-html-parser';

import { parseCodeword } from '../sachen/parseCodeword';
import { ListingPageData } from '../types/Listing';
import getCsrfToken from '../utils/getCsrfToken';
import getLanguageFromTexts from '../utils/getLanguageFromTexts';
import {
  normalizeWhitespace,
  parseEuros,
  parseName,
} from '../utils/stringParsing';

export default function parseListingPage(
  listingPageHtmlStr: string
): ListingPageData {
  const listingPage = parseHtml(listingPageHtmlStr);

  const statRowEls = listingPage
    .querySelectorAll('.table tr')
    .filter((j) => j.querySelectorAll('td').length >= 2);

  const statRows = statRowEls.map((j) => {
    const statKey = normalizeWhitespace(
      j.querySelector('td:nth-child(1)')!.innerText
    )!.split(':')[0];

    const statValue = normalizeWhitespace(
      j.querySelector('td:nth-child(2) b')!.innerText
    );

    return [statKey, statValue];
  });
  const stats = Object.fromEntries(statRows);

  const totalRentEl = listingPage.querySelector(
    ':nth-child(2) h2.headline-key-facts'
  );

  const spaceSquareMetersEl = listingPage.querySelector(
    ':nth-child(1) h2.headline-key-facts'
  );

  const sectionHeadingEls = listingPage.querySelectorAll(
    'h3.headline-detailed-view-panel-title'
  );

  const tagContainerEl = sectionHeadingEls.filter(
    (i) => normalizeWhitespace(i.innerText) === 'Angaben zum Objekt'
  )[0]?.parentNode!;

  const features =
    tagContainerEl == null
      ? []
      : tagContainerEl
        .querySelectorAll('.row div')
        .map((i) => normalizeWhitespace(i.innerText)!)
        .filter((i) => i.length > 0);

  const totalRentEur = parseEuros(totalRentEl?.innerText!) || 0;

  const isSchufaRequired = 'SCHUFA erwünscht' in stats;

  const costs = {
    totalRentEur,
    bondEur: parseEuros(stats['Kaution']) || 0,
    rentEur: parseEuros(stats['Miete']) || 0,
    sideCostsEur: parseEuros(stats['Nebenkosten']) || 0,
    additionalCostsEur: parseEuros(stats['Sonstige Kosten']) || 0,
    transferAgreementEur: parseEuros(stats['Ablösevereinbarung']) || 0,
  };

  const textParagraphEls = listingPage.querySelectorAll(
    '#ad_description_text .wordWrap'
  );
  const textParagraphs = textParagraphEls.map(
    (i) => normalizeWhitespace(i.innerText)!
  );

  // TODO: remove script tag contents from paragraphs

  // issue: the text is not consistent, sometimes there is no h3 and sometimes there is text outside of the p tags
  // const textParagraphRows = textParagraphEls.map((i) => {
  //   const heading = normalizeWhitespace(
  //     i.querySelector('h3')?.innerText ?? null
  //   );
  //   const text = normalizeWhitespace(i.querySelector('p')?.innerText ?? null);

  //   const headingMap = {
  //     "Wohnung": "flat",
  //     "Lage": "location",
  //     "Sonstiges": "other"
  //   }
  //   // @ts-ignore
  //   const key = headingMap[heading] ?? "overview"

  //   return [key, text];
  // });
  // const textParagraphs = Object.fromEntries(textParagraphRows);

  const entireText = textParagraphs.join('\n');

  const sentences = entireText.split(/(\n|\.|\;|\,)/g);

  // true if a sentence contains the word 'anmeldung', but not the words 'no' or 'not'
  const isAnmeldable = sentences.some((sentence) => {
    const words = sentence.split(' ');

    const containsAnmeldung = words.some((i) => i.match(/anmeldung/i));

    const containsNo = words.some((i) => i.match(/(no|not)/i));

    return containsAnmeldung && !containsNo;
  });

  const languages = getLanguageFromTexts(textParagraphs)!;

  const codeWord = parseCodeword(entireText);

  const addressEl = listingPage.querySelector("[href='#mapContainer']");

  const rawAddress = normalizeWhitespace(addressEl?.innerText ?? null)!;

  const location = {
    raw: rawAddress,
  };

  const contactInfoEl =
    listingPage.querySelector('#mailform')?.parentNode?.parentNode?.parentNode;

  // ".row > :first-child > :nth-child(2) > :first-child b:nth-child(2)" in browser for some reason
  const nameEl = contactInfoEl?.querySelector(
    '.row > :first-child b:nth-child(2)'
  );

  const rawPublisherName = normalizeWhitespace(nameEl?.innerText ?? null)!;

  const publisherName = parseName(rawPublisherName);

  console.log(
    'parsed name',
    publisherName.recommended,
    'from',
    rawPublisherName
  );

  const publisher = {
    name: publisherName,
  };
  const sidepanelcontactInfoHeadingEl = listingPage
    .querySelectorAll('h4.panel-title')
    .filter((i) => i.innerText === 'KONTAKTINFORMATIONEN\nEINBLENDEN')[0];

  const sidepanelContactInfoContainerEl =
    sidepanelcontactInfoHeadingEl?.parentNode.parentNode;

  const actionButtonEl =
    sidepanelContactInfoContainerEl?.querySelector('.btn-md');

  const hasExistingConversation =
    normalizeWhitespace(actionButtonEl?.innerText ?? null) === 'UNTERHALTUNG ANSEHEN';

  const onlineSinceEl =
    sidepanelContactInfoContainerEl?.querySelector('div.mb5');

  const onlineSinceText = normalizeWhitespace(onlineSinceEl?.innerText ?? null);

  const publishedDate = (() => {
    if (/ seconds/.test(onlineSinceText!)) {
      return dayjs()
        .subtract(parseInt(onlineSinceText!.replace(/ seconds/, '')), 'seconds')
        .toDate();
    }
    if (/ minutes/.test(onlineSinceText!)) {
      return dayjs()
        .subtract(parseInt(onlineSinceText!.replace(/ minutes/, '')), 'minutes')
        .toDate();
    }
    if (/ hours/.test(onlineSinceText!)) {
      return dayjs()
        .subtract(parseInt(onlineSinceText!.replace(/ hours/, '')), 'hours')
        .toDate();
    }
    if (/ days/.test(onlineSinceText!)) {
      return dayjs()
        .subtract(parseInt(onlineSinceText!.replace(/ days/, '')), 'days')
        .toDate();
    }
    return null;
  })();

  return {
    isSchufaRequired,
    isAnmeldable,
    costs,
    textParagraphs,
    location,
    languages,
    publisher,
    entireText,
    codeWord,
    features,
    publishedDate,
  };
}
