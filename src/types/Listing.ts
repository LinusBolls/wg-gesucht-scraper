type PropertyType = 'FLATSHARE' | 'FLAT' | 'SINGLE_ROOM_FLAT' | 'HOUSE';

export interface RequestPreviewData {
  id: string
  url: string
  title: string
  shortDesc: string
  spaceSquareMeters: number | null;
  startDate: Date | null;

  costs: {
    totalRentEur: number;
  };
  propertyType: PropertyType;
}
export interface RequestPageData {
  hasSchufa: boolean
  languages: string[];
  textParagraphs: string[];
  entireText: string;
  publishedDate: Date | null;

  publisher: ListingPublisher;
  // location: ListingLocation;
  // costs: ListingCosts;
  //   name
  //   title *
  //   city *
  //   rubrik *
  //   mietart *
  //   lage *
  //   gesucht ab *
  //     max miete *
  //       min größe
  // haustyp *
  //   einrichtung
  // sonstiges
  // sprachen

}


export interface ListingPreviewData {
  id: string;
  isCompanyListing: boolean;
  url: string;
  title: string;
  shortDesc: string;
  spaceSquareMeters: number | null;
  startDate: Date | null;
  endDate: Date | null;

  costs: {
    totalRentEur: number;
  };
  propertyType: PropertyType;
  isDeactivated: boolean;
}
export interface ListingPageData {
  isSchufaRequired: boolean;
  isAnmeldable: boolean;
  languages: string[];
  textParagraphs: string[];
  entireText: string;
  codeWord: string | null;
  features: string[];
  publishedDate: Date | null;

  publisher: ListingPublisher;
  location: ListingLocation;
  costs: ListingCosts;
}
export interface ListingPublisher {
  name: {
    raw: string;
    first: string | null;
    last: string | null;
    title: string | null;
    recommended: string | null;
    gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  };
}
export interface ListingCosts {
  totalRentEur: number;
  rentEur: number;
  sideCostsEur: number;
  additionalCostsEur: number;
  bondEur: number;
  transferAgreementEur: number;
}
export interface ListingLocation {
  raw: string;
  // street: string
  // number: string
  // zip: string
  // city: string
  // country: string
}

export interface UserDependendListingData {
  userHasSeen: boolean;
  userHasMadeNote: boolean;
  userHasApplied: boolean;
}
export type Listing = ListingPreviewData & ListingPageData;
