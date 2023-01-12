import axios from 'axios';
import { spawn } from 'child_process';
import { parse as parseCookie } from 'cookie';
import dayjs from 'dayjs';
import { SocksProxyAgent } from 'socks-proxy-agent';

// the tor proxy runs on port 9050 by default
// @ts-ignore
const httpsAgent = new SocksProxyAgent("socks5://localhost:9050");

// const proxy = spawn("docker", [
//   ...["run", "--rm", "-i", "-a", "stdout"],
//   ...["-p", "127.0.0.1:9050:9050/tcp"],
//   ...["osminogin/tor-simple:latest"],
// ]);

// proxy.stdout.on("data", (data) => {
//   console.log("sache von dings:", data)
//   process.stderr.write(data);
//   if (data.toString().includes("Opened Socks listener")) {
//     // @ts-ignore
//     run().finally(() => proxy.kill("SIGINT"));
//   }
// });

const httpClient = axios.create({
  // httpsAgent,
  withCredentials: true,
});

export default class WGGClient {
  private readonly _headers: Record<string, string> = {};
  private readonly _userId: string;

  constructor(cookie: string, userId: string) {
    const cookieData = parseCookie(cookie);

    this._headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:108.0) Gecko/20100101 Firefox/108.0',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
      'Content-Type': 'application/json',

      'X-User-Id': userId,
      'X-Authorization': `Bearer ${cookieData['X-Access-Token']!}`,
      'X-Client-Id': cookieData['X-Client-Id']!,
      'X-Dev-Ref-No': cookieData['X-Dev-Ref-No']!,
      'X-Requested-With': 'XMLHttpRequest',

      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-GPC': '1',
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      Cookie: cookie,
    };
    this._userId = userId;
  }
  async postListingNote(
    offerId: string,
    csrfToken: string,
    text: string
  ): Promise<[Error, null] | [null, string]> {
    try {
      const postUrl = 'https://www.wg-gesucht.de/api/ad-notes';

      // const putUrl = `https://www.wg-gesucht.de/api/ad-notes/users/${this._userId}/assets/${offerId}`;

      const body = {
        user_id: this._userId,
        offer_id: offerId,
        text,
        csrf_token: csrfToken,
      };

      const res = await httpClient.post<any>(postUrl, body, {
        headers: this._headers,
        withCredentials: true,
      });
      const { detail } = res.data;

      return [null, detail];
    } catch (err) {
      return [err as Error, null];
    }
  }
  async postListingApplication(
    offerId: string,
    csrfToken: string,
    texts: string[],
    attachedListingId?: string | null
  ): Promise<[Error, null] | [null, any]> {
    try {
      const postUrl =
        'https://www.wg-gesucht.de/ajax/conversations.php?action=conversations';

      let messages = texts.map((text) => ({
        content: text,
        message_type: 'text',
      }));

      if (attachedListingId != null) {
        messages.push({
          content: attachedListingId,
          message_type: 'attached_request',
        });
      }

      const body = {
        user_id: this._userId,
        ad_id: offerId,
        csrf_token: csrfToken,
        ad_type: '0',
        messages,
      };
      interface Response {
        conversation_id: string;
        messages: any[];
        _links: {
          self: {
            href: string;
          };
        };
      }

      const res = await httpClient.post<Response>(postUrl, body, {
        headers: this._headers,
        withCredentials: true,
      });

      return [null, res.data];
    } catch (err) {
      return [err as Error, null];
    }
  }
  async getListings(url: string): Promise<[Error, null] | [null, string]> {
    try {
      const res = await httpClient.get<string>(url, { headers: this._headers });

      const data = res.data;

      return [null, data];
    } catch (err) {
      return [err as Error, null];
    }
  }
  async getListing(url: string): Promise<[Error, null] | [null, string]> {
    try {
      const res = await httpClient.get<string>(url, { headers: this._headers });

      const data = res.data;

      return [null, data];
    } catch (err) {
      return [err as Error, null];
    }
  }
  static async signIn(username: string, password: string) {
    try {
      const body = {
        login_email_username: username,
        login_password: password,
        login_form_auto_login: '1',
        display_language: 'de',
      };
      const options = {
        // headers: this._headers,
        // withCredentials: true,
      };

      const res = await httpClient.post<SignInResponse>(
        'https://www.wg-gesucht.de/ajax/sessions.php?action=login',
        body,
        options
      );
      const cookie = res.headers['set-cookie']!.join(';');

      const {
        user_id: userId,
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_in: expiresInMinutes,
      } = res.data;

      const createdDate = dayjs().toDate();

      const expiryDate = dayjs(createdDate)
        .add(expiresInMinutes, 'minutes')
        .toDate();

      return [
        null,
        {
          userId,
          refreshToken,
          accessToken,
          cookie,
          createdDate,
          expiryDate,
        },
      ] as const;
    } catch (err) {
      return [
        err,
        {
          userId: null,
          refreshToken: null,
          accessToken: null,
          cookie: null,
          createdDate: null,
          expiryDate: null,
        },
      ] as const;
    }
  }
}

interface SignInResponse {
  access_token: string;
  expires_in: number; // expiry time of the access_token in minutes, typically 3600 which translates to one hour
  token_type: 'Bearer';
  scope: null;
  refresh_token: string;
  user_id: string;
  dev_ref_no: string;
  csrf_token: string;
}
