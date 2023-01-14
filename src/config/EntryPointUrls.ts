type PropertyType = 'FLATSHARE' | 'FLAT' | 'SINGLE_ROOM_FLAT' | 'HOUSE';

type ListingType = 'OFFER' | 'REQUEST';

type City = 'Berlin';

interface EntryPoint {
  title: string;
  baseUrl: string;
  listingTypes: ListingType[];
  propertyTypes: PropertyType[];
  cities: City[];
  port: number;
  refetchIntervalSeconds: number;
}

const EntryPointUrls: EntryPoint[] = [
  // {
  //     title: 'WGs in Berlin',
  //     baseUrl: 'https://www.wg-gesucht.de/wg-zimmer-in-Berlin.8.0.1.0.html',
  //     listingTypes: ['OFFER'],
  //     propertyTypes: ['FLATSHARE'],
  //     cities: ['Berlin'],
  //     port: 9050,
  //     refetchIntervalSeconds: 30,
  // },
  // {
  //     title: 'Flats in Berlin',
  //     baseUrl: 'https://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.1.0.html',
  //     listingTypes: ['OFFER'],
  //     propertyTypes: ['FLAT'],
  //     cities: ['Berlin'],
  //     port: 9050,
  //     refetchIntervalSeconds: 30,
  // },
  // {
  //     title: 'Single Room Flats in Berlin',
  //     baseUrl:
  //         'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html',
  //     listingTypes: ['OFFER'],
  //     propertyTypes: ['SINGLE_ROOM_FLAT'],
  //     cities: ['Berlin'],
  //     port: 9050,
  //     refetchIntervalSeconds: 30,
  // },
  // {
  //   title: 'Houses in Berlin',
  //   baseUrl: 'https://www.wg-gesucht.de/haeuser-in-Berlin.8.3.1.0.html',
  //   listingTypes: ['OFFER'],
  //   propertyTypes: ['HOUSE'],
  //   cities: ['Berlin'],
  //   port: 9050,
  //   refetchIntervalSeconds: 30,
  // },
  {
    title: 'Offers in Berlin',
    baseUrl:
      'https://www.wg-gesucht.de/wg-zimmer-und-1-zimmer-wohnungen-und-wohnungen-und-haeuser-in-Berlin.8.0+1+2+3.1.0.html',
    listingTypes: ['OFFER'],
    propertyTypes: ['FLATSHARE', 'FLAT', 'SINGLE_ROOM_FLAT', 'HOUSE'],
    cities: ['Berlin'],
    port: 9050,
    refetchIntervalSeconds: 30,
  },
  //   {
  //     title: 'Requests in Berlin',
  //     baseUrl:
  //       'https://www.wg-gesucht.de/wg-zimmer-und-1-zimmer-wohnungen-und-wohnungen-und-haeuser-in-Berlin-gesucht.8.0+1+2+3.1.0.html',
  //     listingTypes: ['REQUEST'],
  //     propertyTypes: ['FLATSHARE', 'FLAT', 'SINGLE_ROOM_FLAT', 'HOUSE'],
  //     cities: ['Berlin'],
  //     port: 9052,
  //     refetchIntervalSeconds: 30,
  //   },
];
export default EntryPointUrls;

// const torProxiedHttpClient = getTorProxiedClient(9050);

// const wggClient = new WGGClient(
//   torProxiedHttpClient,
//   session.cookie,
//   session.userId
// );

/**
 * torrc location
 *
 * on debian, installed via "sudo apt-get tor":
 * /etc/tor/torrc
 *
 * services restart tor
 *
 * on macOS Monterey 12.1, running on a MacBook Air (M1, 2020), installed via "brew install tor":
 * /opt/homebrew/etc/tor/torrc
 *
 * brew services restart tor
 */
