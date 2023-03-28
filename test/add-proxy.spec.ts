import { S3Client } from '@aws-sdk/client-s3';
import { mocked } from 'ts-jest/utils';
import ProxyAgent from 'proxy-agent';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { addProxyToClient } from '../src';
import { AddProxyOptions } from '../src/types';
jest.mock('@aws-sdk/node-http-handler');

const MockNodeHttpHandler = mocked(NodeHttpHandler);

describe('add-proxy', () => {
  describe('addProxyToClient', () => {
    let client: S3Client;
    let logSpy = jest.spyOn(global.console, 'log');
    const PREV_ENV = process.env;

    beforeEach(() => {
      jest.resetAllMocks();
      process.env = { ...PREV_ENV };
      client = new S3Client({
        region: 'us-east-1',
      });
      logSpy = jest.spyOn(global.console, 'log');
    });

    afterEach(() => {
      process.env = PREV_ENV;
    });

    it('should return an instance of the client with the NodeHttpHandler attached', () => {
      process.env.HTTPS_PROXY = 'https://localhost';

      const s3 = addProxyToClient(client);

      expect(s3.config.requestHandler).toBeInstanceOf(NodeHttpHandler);
    });

    it('should throw when no proxy is found on env', () => {
      const error = new Error(
        'Unable to add proxy to AWS SDK client. No proxy found in process.env'
      );
      const fn = () => addProxyToClient(client);

      expect(fn).toThrowError(error);
    });

    it('should not throw when no proxy is found on env and throwOnNoProxy is false', () => {
      const opts: AddProxyOptions = {
        throwOnNoProxy: false,
      };

      const fn = () => addProxyToClient(client, opts);

      expect(fn).not.toThrow();
    });

    it('should attach an httpAgent AND httpsAgent when both proxies are set', () => {
      process.env.HTTP_PROXY = 'http://localhost';
      process.env.HTTPS_PROXY = 'https://localhost';

      addProxyToClient(client);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith({
        httpAgent: new ProxyAgent('http://localhost'),
        httpsAgent: new ProxyAgent('https://localhost'),
      });
    });

    it('should attach an httpAgent as the requestHandler when an http proxy is set', () => {
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith({
        httpAgent: new ProxyAgent('http://localhost'),
        httpsAgent: new ProxyAgent('http://localhost'),
      });
    });

    it('should attach an httpsAgent as the requestHandler when an https proxy is set', () => {
      process.env.HTTPS_PROXY = 'https://localhost';

      addProxyToClient(client);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith({
        httpAgent: new ProxyAgent('https://localhost'),
        httpsAgent: new ProxyAgent('https://localhost'),
      });
    });

    it('should use https proxy when httpsOnly is true and both proxies are set on env', () => {
      const opts: AddProxyOptions = {
        httpsOnly: true,
      };
      process.env.HTTPS_PROXY = 'https://localhost';
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client, opts);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith({
        httpsAgent: new ProxyAgent('https://localhost'),
        httpAgent: new ProxyAgent('https://localhost'),
      });
    });

    it('should use https proxy when httpsOnly is true and only https proxy is set on env', () => {
      const opts: AddProxyOptions = {
        httpsOnly: true,
      };
      process.env.https_proxy = 'https://localhost';

      addProxyToClient(client, opts);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith({
        httpsAgent: new ProxyAgent('https://localhost'),
        httpAgent: new ProxyAgent('https://localhost'),
      });
    });

    it('should print to the console when debug is set to true', () => {
      const opts: AddProxyOptions = {
        debug: true,
      };
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client, opts);

      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('should not print to the console when debug is set to false', () => {
      const opts: AddProxyOptions = {
        debug: false,
      };
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client, opts);

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should add connectionTimeout when provided', () => {
      const opts: AddProxyOptions = {
        connectionTimeout: 100,
      };
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client, opts);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith(
        expect.objectContaining(opts)
      );
    });

    it('should add socketTimeout when provided', () => {
      const opts: AddProxyOptions = {
        socketTimeout: 10,
      };
      process.env.HTTP_PROXY = 'http://localhost';

      addProxyToClient(client, opts);

      expect(MockNodeHttpHandler).toHaveBeenCalledWith(
        expect.objectContaining(opts)
      );
    });
  });
});
