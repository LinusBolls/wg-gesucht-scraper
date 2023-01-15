import axios, { AxiosInstance } from 'axios';
import { spawn } from 'child_process';
import { SocksProxyAgent } from 'socks-proxy-agent';

// const proxy = spawn("docker", [
//   ...["run", "--rm", "-i", "-a", "stdout"],
//   ...["-p", "127.0.0.1:9050:9050/tcp"],
//   ...["osminogin/tor-simple:latest"],
// ]);

// proxy.stdout.on("data", (data) => {
//   console.log("sache von dings:", data)

//   process.stderr.write(data);
//   if (data.toString().includes("Opened Socks listener")) {
//      proxy.kill("SIGINT"));
//   }
// });

export const getTorProxiedClient = (port: number) => {
  // the "h" component in the protocol is to also make the ssl check over tor
  const torProxyUri = 'socks5h://localhost:' + port;

  const httpsAgent = new SocksProxyAgent(torProxyUri);

  const torProxiedClient = axios.create({
    httpsAgent,
    withCredentials: true,
  });
  torProxiedClient.interceptors.response.use(
    (res) => {
      // console.log("something happened in torProxiedClient:", res)

      return Promise.resolve(res);
    },
    (err) => {
      // console.error("an error occured in torProxiedClient:", err)

      return Promise.reject(err);
    }
  );
  return torProxiedClient;
};

export async function getTorIp(torProxiedClient: AxiosInstance) {
  const res = await torProxiedClient.get<{ IsTor: boolean; IP: string }>(
    'https://check.torproject.org/api/ip'
  );

  const { IsTor, IP } = res.data;

  return IP;
}

export async function checkTorConnection(port: number) {
  const torProxyUri = `socks5h://localhost:${port}`;

  try {
    const torProxiedClient = getTorProxiedClient(port);

    const ip = await getTorIp(torProxiedClient);

    console.info(
      "[Tor Proxy] connected to tor proxy '" +
      torProxyUri +
      "' with exit ip '" +
      ip +
      "'"
    );
  } catch (err) {
    const isCausedByUnregisteredTorPort =
      // @ts-ignore
      err?.message?.includes('ECONNREFUSED');

    if (isCausedByUnregisteredTorPort) {
      console.error(
        "[Tor Proxy] failed to connect to tor proxy '" +
        torProxyUri +
        "': ECONNREFUSED"
      );

      console.info(
        `add 'SOCKSPort ${port}' to your torrc and restart the tor service`
      );
      console.info(
        `depending on your environment you might also have to add 'SOCKSPort [::1]:${port}' to your torrc to support ipv6 connections and restart the tor service`
      );

      process.exit();
    }
    console.error(
      "[Tor Proxy] failed to connect to tor proxy '" + torProxyUri + "'"
    );
    process.exit();
  }
}

export async function changeTorIp() {
  spawn('killall', ['-HUP', 'tor']);
}
// checkTorConnection(9050)
// checkTorConnection(9052)
// checkTorConnection(9053)
// checkTorConnection(9054)
