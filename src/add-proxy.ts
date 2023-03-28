import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import ProxyAgent from 'proxy-agent';
import { AddProxyOptions, ClientWithConfig } from './types';

export const getHttpProxy = (): string =>
  process.env.http_proxy || process.env.HTTP_PROXY || '';

export const getHttpsProxy = (): string =>
  process.env.https_proxy || process.env.HTTPS_PROXY || '';

export const addProxyToClient = <T>(
  client: ClientWithConfig<T>,
  {
    debug = false,
    httpsOnly = false,
    throwOnNoProxy = true,
    ...opts
  }: AddProxyOptions = {}
): T => {
  const httpProxy = getHttpProxy();
  const httpsProxy = getHttpsProxy();
  const httpAgent = httpProxy ? new ProxyAgent(httpProxy) : undefined;
  const httpsAgent = httpsProxy ? new ProxyAgent(httpsProxy) : undefined;
  const log = debug ? console.log : () => null;

  if (httpProxy && httpsProxy) {
    if (httpsOnly) {
      log(
        `Setting https proxy to ${httpsProxy} (httpsOnly enabled with both https and http found in env)`
      );
      client.config.requestHandler = new NodeHttpHandler({
        httpAgent: httpsAgent,
        httpsAgent,
        ...opts,
      });
    } else {
      log(
        `Setting http proxy to ${httpProxy} and https proxy to ${httpsProxy}`
      );
      client.config.requestHandler = new NodeHttpHandler({
        httpAgent,
        httpsAgent,
        ...opts,
      });
    }

    return client;
  }

  if (httpProxy && !httpsOnly) {
    log(`Setting http proxy to ${httpProxy}`);
    client.config.requestHandler = new NodeHttpHandler({
      httpAgent,
      httpsAgent: httpAgent,
      ...opts,
    });
  } else if (httpsProxy) {
    log(`Setting https proxy to ${httpsProxy}`);
    client.config.requestHandler = new NodeHttpHandler({
      httpAgent: httpsAgent,
      httpsAgent,
      ...opts,
    });
  } else if (throwOnNoProxy) {
    log(
      'No proxy found in env, and throwOnNoProxy is set to true, throwing error'
    );
    throw new Error(
      'Unable to add proxy to AWS SDK client. No proxy found in process.env'
    );
  }

  return client;
};
