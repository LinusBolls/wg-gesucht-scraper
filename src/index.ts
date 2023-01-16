import express, { RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { parse as parseHtml } from 'node-html-parser';
import { config as loadEnv } from 'dotenv';

import WGGClient from './WGGClient';
import parseListingsPage from './domParsing/parseListingsPage';
import parseListingPage from './domParsing/parseListingPage';
import { Listing, RequestListing, UserDependendListingData } from './types/Listing';
import getCsrfToken from './utils/getCsrfToken';
import { normalizeWhitespace } from './utils/stringParsing';
import { getTorProxiedClient } from './WGGClient/torProxy';
import EntryPointUrls from './config/EntryPointUrls';

loadEnv();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

type Session = any;

let sessions: Record<string, Session> = {};
let offers: Listing[] = [];
let requests: RequestListing[] = [];

function createRandomSessionGenerator() {
  let currentSessionIdx = 0;

  return () => {
    if (Object.values(sessions).length < 1) return null;

    if (currentSessionIdx >= Object.values(sessions).length)
      currentSessionIdx = 0;

    const session = Object.values(sessions)[currentSessionIdx];

    currentSessionIdx++;

    return session;
  };
}
const getRandomSession = createRandomSessionGenerator();

const SessionSchema = z.object({
  email: z.string().email(), // .endsWith("@code.berlin"),
  password: z.string().min(1),
});
function handleSession() {
  return (async (req, res, next) => {
    const sache = req.method === 'GET' ? req.query : req.body;

    const { success, data } = SessionSchema.safeParse(sache) as any;

    if (!success) {
      res.status(400).json({ ok: 0 });

      return;
    }
    const { email, password } = data;

    let isSignedIn = true;
    let session: any;

    if (email in sessions) {
      session = sessions[email];
    } else {
      const torProxiedHttpClient = getTorProxiedClient(9050);

      const [signInErr, metaIdentity] = await WGGClient.signIn(
        torProxiedHttpClient,
        email,
        password
      );

      console.log('signInErr:', signInErr);

      isSignedIn = signInErr == null;

      if (!isSignedIn) {
        res.status(401).json({ ok: 0 });

        return;
      }
      session = {
        client: torProxiedHttpClient,
        isSignedIn: true,
        email,
        password,
        ...metaIdentity,
        webhook: {
          isRegistered: false,
        },
      };
      sessions[email] = session;
    }
    // @ts-ignore
    const { torProxiedClient: disard, ...safeSession } = session;

    (req as any).meta = { session: safeSession };

    next();
  }) as RequestHandler;
}

app.get('/v1/fetch', async (req, res) => {
  await fetchOffers();

  res.json({ ok: 1 });
});

let actionKeys: string[] = [];

function hasActionHappened(
  actorId1: string,
  action: 'SAW' | 'APPLIED' | 'MADE_NOTE',
  actorId2: string
) {
  const actionKey = [actorId1, action, actorId2].join('|');

  return actionKeys.includes(actionKey);
}
function registerAction(
  actorId1: string,
  action: 'SAW' | 'APPLIED' | 'MADE_NOTE',
  actorId2: string
) {
  const actionKey = [actorId1, action, actorId2].join('|');

  actionKeys.push(actionKey);
}

app.get('/v1/listings', handleSession(), async (req, res) => {
  const enrichedListings = offers.map<Listing & UserDependendListingData>(
    (listing) => {
      const userHasSeen = hasActionHappened(
        (req as any).meta.session.email,
        'SAW',
        listing.id
      );
      const userHasMadeNote = hasActionHappened(
        (req as any).meta.session.email,
        'MADE_NOTE',
        listing.id
      );
      const userHasApplied = hasActionHappened(
        (req as any).meta.session.email,
        'APPLIED',
        listing.id
      );
      registerAction((req as any).meta.session.email, 'SAW', listing.id);

      const sache: UserDependendListingData = {
        userHasSeen,
        userHasMadeNote,
        userHasApplied,
      };

      const enrichedListing = {
        ...listing,
        ...sache,
      };

      return enrichedListing;
    }
  );
  res.json({
    ok: 1,
    data: enrichedListings,
    meta: (req as any).meta,
  });
});

app.post('/v1/notes', handleSession(), async (req, res) => {
  const QuerySchema = z.object({
    listingId: z.string(),
    text: z.string(),
  });
  const { success, data } = QuerySchema.safeParse(req.body) as any;

  if (!success) {
    res.status(400).json({ ok: 0 });

    return;
  }
  const { listingId, text } = data;

  const torProxiedHttpClient = sessions[(req as any).meta.session.email].client;

  const client = new WGGClient(
    torProxiedHttpClient,
    (req as any).meta.session.cookie,
    (req as any).meta.session.userId
  );
  const listing = offers.filter((i) => i.id === listingId)[0]!;

  const [getListingPageErr, listingPage] = await client.getListing(listing.url);

  if (getListingPageErr != null) throw getListingPageErr;

  const csrfToken = getCsrfToken(parseHtml(listingPage))!;

  const [postNoteErr, postNoteRes] = await client.postListingNote(
    listingId,
    csrfToken,
    text
  );

  if (postNoteErr != null) {
    // console.error("error posting note:", postNoteErr)

    res.status(400).json({
      ok: 0,
      data: null,
      meta: (req as any).meta,
    });
    return;
  }
  registerAction((req as any).meta.session.email, 'MADE_NOTE', listingId);

  res.status(201).json({
    ok: 1,
    data: postNoteRes,
    meta: (req as any).meta,
  });
});

app.post('/v1/webhooks', handleSession(), async (req, res) => {
  const QuerySchema = z.object({
    url: z.string().url(),
  });
  const { success, data } = QuerySchema.safeParse(req.body) as any;

  if (!success) {
    res.status(400).json({ ok: 0 });

    return;
  }
  const { url } = data;

  sessions[(req as any).meta.session.email].webhook = {
    isRegistered: true,
    url,
  };

  res.json({
    ok: 1,
    data: {
      url,
    },
    message: `from now on, every time a new listing is scraped, this url will receive a POST request with a body of { event: "NEW_LISTINGS", data: Listing[] }. if your url responds with a body of { email: string, password: string, data: Record<ListingId, { note?: string, application?: string }> }, you can create new notes and applications on your wg-gesucht account. each user can only register a single webhook. POST this endpoint again to overwrite or DELETE to unregister this url.`,
    meta: (req as any).meta,
  });
});

app.delete('/v1/webhooks', handleSession(), async (req, res) => {
  sessions[(req as any).meta.session.email].webhook = {
    isRegistered: false,
  };

  res.json({
    ok: 1,
    data: null,
    message: `webhook unregistered. POST this endpoint to reregister.`,
    meta: (req as any).meta,
  });
});

app.post('/v1/applications', handleSession(), async (req, res) => {
  const QuerySchema = z.object({
    listingId: z.string(),
    messages: z.array(z.string()),
    quitIfExistingConversation: z.boolean().optional(),
    attachedListingId: z.string().optional(),
  });
  const { success, data } = QuerySchema.safeParse(req.body) as any;

  if (!success) {
    res.status(400).json({ ok: 0 });

    return;
  }
  const {
    listingId,
    messages,
    attachedListingId = null,
    quitIfExistingConversation = true,
  } = data;

  const torProxiedHttpClient = sessions[(req as any).meta.session.email].client;

  const client = new WGGClient(
    torProxiedHttpClient,
    (req as any).meta.session.cookie,
    (req as any).meta.session.userId
  );
  const listing = offers.filter((i) => i.id === listingId)[0]!;

  const [getListingPageErr, listingPageText] = await client.getListing(
    listing.url
  );

  if (getListingPageErr != null) throw getListingPageErr;

  const listingPage = parseHtml(listingPageText);

  const csrfToken = getCsrfToken(listingPage)!;

  const sidepanelcontactInfoHeadingEl = listingPage
    .querySelectorAll('h4.panel-title')
    .filter((i) => i.innerText === 'KONTAKTINFORMATIONEN\nEINBLENDEN')[0];

  const sidepanelContactInfoContainerEl =
    sidepanelcontactInfoHeadingEl?.parentNode.parentNode;

  const actionButtonEl =
    sidepanelContactInfoContainerEl?.querySelector('.btn-md');

  const hasExistingConversation =
    normalizeWhitespace(actionButtonEl?.innerText ?? null) ===
    'UNTERHALTUNG ANSEHEN';

  if (hasExistingConversation && quitIfExistingConversation) {
    res.status(200).json({
      ok: 0,
      data: null,
      message: `did not send messages because you already have a conversation with "${listingId}" and did not specify "quitIfExistingConversation": false in your request body.`,
      meta: (req as any).meta,
    });
    return;
  }

  const [postApplicationErr, postApplicationRes] =
    await client.postListingApplication(
      listingId,
      csrfToken,
      messages,
      attachedListingId
    );

  if (postApplicationErr != null) {
    console.error(
      'error occured trying to post application:',
      Object.keys(postApplicationErr)
    );

    const sache = (postApplicationErr as AxiosError<{ type: string, title: string, status: number, detail: string }>).response?.data?.detail

    console.info("error.response.data.detail:", sache)

    res.status(400).json({
      ok: 0,
      data: null,
      meta: (req as any).meta,
    });
    return;
  }

  registerAction((req as any).meta.session.email, 'APPLIED', listingId);

  res.status(201).json({
    ok: 1,
    data: postApplicationRes,
    meta: (req as any).meta,
  });
});

fetchOffers();

setInterval(fetchOffers, 1000 * 30);

app.listen(process.env.PORT, () => {
  console.info(`app listening at http://127.0.0.1:${process.env.PORT}`);
});

async function fetchOffers() {
  for (const {
    baseUrl: url,
    listingTypes,
    propertyTypes,
    cities,
    port,
    title,
  } of EntryPointUrls) {
    const session = getRandomSession();

    if (session == null) return;

    // refactor: get from ListingType
    const torProxiedHttpClient = getTorProxiedClient(port);

    const wggClient = new WGGClient(
      torProxiedHttpClient,
      session.cookie,
      session.userId
    );
    console.info(
      `fetching "${title}" listings using "${session.email}" over tor proxy "socks5h://localhost:${port}"`
    );

    const [getListingsErr, listingsPageHtml] = await wggClient.getListings(url);

    if (getListingsErr != null) {

      const isDings = getListingsErr.message?.includes('ECONNRESET')

      throw new Error('error fetching offer listings:' + getListingsErr);
    }

    const { listings: listingOverviews, partneredListings } =
      parseListingsPage(listingsPageHtml);

    const newListings = await Promise.all<Listing>(
      // wg-gesucht usually inserts at least one company-sponsored listing, we don't want those
      listingOverviews
        .filter((i) => !i.isCompanyListing)
        // we don't want listings we already know either, for bandwidth reasons
        .filter((i) => {
          const cachedListing = offers.filter((j) => j.id === i.id)[0];
          const isKnown = cachedListing != null;

          return !isKnown;
        })
        .map(async (listingOverviewData) => {
          console.info(
            `fetching "${listingOverviewData.propertyType}" listing "${listingOverviewData.url}" using "${session.email}" over tor proxy "socks5h://localhost:${port}"`
          );

          const [getListingErr, listingPageHtml] = await wggClient.getListing(
            listingOverviewData.url
          );

          if (getListingErr != null) throw new Error('sache');

          const listingPageData = parseListingPage(listingPageHtml);

          const now = dayjs().toDate();

          const firstScrapedDate = now;
          const lastScrapedDate = now;

          return {
            ...listingOverviewData,
            ...listingPageData,
            firstScrapedDate,
            lastScrapedDate,
          };
        })
    );
    offers = [...offers, ...newListings];
  }

  async function callWebhook(
    url: string,
    event: 'NEW_LISTING',
    data: Listing[]
  ) {
    const body = {
      event,
      data,
    };
    const res = await axios.post<any>(url, body);

    const QuerySchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      data: z.record(
        z.string(),
        z.object({
          application: z.string().optional(),
          note: z.string().optional(),
        })
      ),
    });
    // @ts-ignore
    const { success, clientData } = QuerySchema.safeParse(res.data) as any;

    if (!success) return;

    const { email, password, data: actionData } = clientData;

    const session = sessions[email];

    // refactor: get from session
    const torProxiedHttpClient = getTorProxiedClient(9050);

    const client = new WGGClient(torProxiedHttpClient, session.id, password);

    for (const [listingId, actions] of Object.entries(actionData)) {
      for (const [action, payload] of Object.entries(actions!)) {
        if (action === 'application') {
          const listing = offers.filter((i) => i.id === listingId)[0]!;

          const [getListingPageErr, listingPage] = await client.getListing(
            listing.url
          );

          if (getListingPageErr != null) throw getListingPageErr;

          const csrfToken = getCsrfToken(parseHtml(listingPage))!;

          await client.postListingApplication(listingId, csrfToken, payload);
        }
        if (action === 'note') {
          const listing = offers.filter((i) => i.id === listingId)[0]!;

          const [getListingPageErr, listingPage] = await client.getListing(
            listing.url
          );

          if (getListingPageErr != null) throw getListingPageErr;

          const csrfToken = getCsrfToken(parseHtml(listingPage))!;

          await client.postListingNote(listingId, csrfToken, payload);
        }
      }
    }
  }
}
