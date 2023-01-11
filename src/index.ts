import express, { RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import axios from 'axios';
import dayjs from 'dayjs';
import { parse as parseHtml } from 'node-html-parser';
import { config as loadEnv } from "dotenv"

import WGGClient from './WGGClient';
import parseListingsPage from './domParsing/parseListingsPage';
import parseListingPage from './domParsing/parseListingPage';
import { Listing, UserDependendListingData } from './types/Listing';
import getCsrfToken from './utils/getCsrfToken';

loadEnv()

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

let sessions: Record<string, any> = {};
let listings: Listing[] = [];

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
      const [signInErr, metaIdentity] = await WGGClient.signIn(email, password);

      isSignedIn = signInErr == null;

      if (!isSignedIn) {
        res.status(401).json({ ok: 0 });

        return;
      }
      session = {
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
    (req as any).meta = { session };

    next();
  }) as RequestHandler;
}

app.get('/v1/fetch', async (req, res) => {
  await fetchListings();

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

  const enrichedListings = listings.map<Listing & UserDependendListingData>(listing => {

    const userHasSeen = hasActionHappened(
      (req as any).meta.email,
      'SAW',
      listing.id
    );
    const userHasMadeNote = hasActionHappened(
      (req as any).meta.email,
      'MADE_NOTE',
      listing.id
    );
    const userHasApplied = hasActionHappened(
      (req as any).meta.email,
      'APPLIED',
      listing.id
    );
    registerAction((req as any).meta.email, 'SAW', listing.id);

    const sache: UserDependendListingData = {
      userHasSeen,
      userHasMadeNote,
      userHasApplied,
    }

    const enrichedListing = {
      ...listing,
      ...sache,
    }

    return enrichedListing
  })
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

  const client = new WGGClient(
    (req as any).meta.session.cookie,
    (req as any).meta.session.userId
  );
  const listing = listings.filter((i) => i.id === listingId)[0]!;

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
  registerAction((req as any).meta.email, 'MADE_NOTE', listingId);

  res.json({
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

  sessions[(req as any).meta.email].webhook = {
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
  sessions[(req as any).meta.email].webhook = {
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
    text: z.string(),
  });
  const { success, data } = QuerySchema.safeParse(req.query) as any;

  if (!success) {
    res.status(400).json({ ok: 0 });

    return;
  }
  const { listingId, text } = data;

  const client = new WGGClient(
    (req as any).meta.session.cookie,
    (req as any).meta.session.userId
  );
  const listing = listings.filter((i) => i.id === listingId)[0]!;

  const [getListingPageErr, listingPage] = await client.getListing(listing.url);

  if (getListingPageErr != null) throw getListingPageErr;

  const csrfToken = getCsrfToken(parseHtml(listingPage))!;

  const [postApplicationErr, postApplicationRes] =
    await client.postListingApplication(listingId, csrfToken, text);

  if (postApplicationErr != null) {
    res.status(400).json({
      ok: 0,
      data: null,
      meta: (req as any).meta,
    });
    return;
  }

  registerAction((req as any).meta.email, 'APPLIED', listingId);

  res.json({
    ok: 1,
    data: postApplicationRes,
    meta: (req as any).meta,
  });
});

fetchListings();

setInterval(fetchListings, 1000 * 30);

app.listen(process.env.PORT, () => {
  console.info(`app listening at http://127.0.0.1:${process.env.PORT}`);
});

async function fetchListings() {
  if (Object.keys(sessions).length < 1) return;

  const { cookie, userId } = sessions['linus.bolls@gmail.com'];

  const wggClient = new WGGClient(cookie, userId);

  const url =
    'https://www.wg-gesucht.de/1-zimmer-wohnungen-in-Berlin.8.1.1.0.html';

  console.info('fetching listings');

  const [getListingsErr, listingsPageHtml] = await wggClient.getListings(url);

  if (getListingsErr != null) throw new Error('sache');

  const { listings: listingOverviews, partneredListings } =
    parseListingsPage(listingsPageHtml);

  listings = await Promise.all(
    // wg-gesucht usually inserts at least one company-sponsored listing, we don't want those
    listingOverviews
      .filter((i) => !i.isCompanyListing)
      .map(async (listingOverviewData) => {
        const cachedListing = listings.filter(
          (i) => i.id === listingOverviewData.id
        )[0];

        if (cachedListing) return cachedListing;

        console.info('fetching listing', listingOverviewData.url);

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
}

async function callWebhook(url: string, event: 'NEW_LISTING', data: Listing[]) {
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

  const client = new WGGClient(session.id, password);

  for (const [listingId, actions] of Object.entries(actionData)) {
    for (const [action, payload] of Object.entries(actions!)) {
      if (action === 'application') {
        const listing = listings.filter((i) => i.id === listingId)[0]!;

        const [getListingPageErr, listingPage] = await client.getListing(
          listing.url
        );

        if (getListingPageErr != null) throw getListingPageErr;

        const csrfToken = getCsrfToken(parseHtml(listingPage))!;

        await client.postListingApplication(listingId, csrfToken, payload);
      }
      if (action === 'note') {
        const listing = listings.filter((i) => i.id === listingId)[0]!;

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
