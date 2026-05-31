const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');

require('../setup');
require('../helpers').setupTestConfig();

describe('OpenWA Module', () => {
  let axiosPostStub;

  beforeEach(() => {
    axiosPostStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    sinon.restore();
    delete require.cache[require.resolve('../../src/openwa')];
  });

  describe('sendMessage()', () => {
    it('should POST to the OpenWA gateway with correct chatId format', async () => {
      axiosPostStub.resolves({ status: 201, data: {} });
      const { sendMessage } = require('../../src/openwa');

      const result = await sendMessage('6588775526', 'Hello coach');

      expect(axiosPostStub.calledOnce).to.be.true;
      const [url, body, opts] = axiosPostStub.firstCall.args;
      expect(url).to.include('/api/sessions/');
      expect(url).to.include('/messages/send-text');
      expect(body.chatId).to.equal('6588775526@c.us');
      expect(body.text).to.equal('Hello coach');
      expect(opts.headers['X-API-Key']).to.equal('dev-admin-key');
      expect(result).to.be.true;
    });

    it('should strip non-digit characters from phone number', async () => {
      axiosPostStub.resolves({ status: 200, data: {} });
      const { sendMessage } = require('../../src/openwa');

      await sendMessage('+65 8877 5526', 'Test');

      const [, body] = axiosPostStub.firstCall.args;
      expect(body.chatId).to.equal('6588775526@c.us');
    });

    it('should return false and not throw when gateway returns an error', async () => {
      axiosPostStub.rejects(new Error('ECONNREFUSED'));
      const { sendMessage } = require('../../src/openwa');

      const result = await sendMessage('6588775526', 'Test');
      expect(result).to.be.false;
    });
  });

  describe('getOpenWAStatus()', () => {
    it('should return enabled true and reachable true when gateway responds', async () => {
      const axiosGetStub = sinon.stub(axios, 'get').resolves({ status: 200 });
      const { getOpenWAStatus } = require('../../src/openwa');

      const status = await getOpenWAStatus();

      expect(status).to.have.property('enabled');
      expect(status.reachable).to.be.true;
      expect(status.gatewayUrl).to.equal('http://127.0.0.1:2785');
      expect(status.sessionName).to.equal('main');
      axiosGetStub.restore();
    });

    it('should return reachable false when gateway is down', async () => {
      const axiosGetStub = sinon.stub(axios, 'get').rejects(new Error('ECONNREFUSED'));
      const { getOpenWAStatus } = require('../../src/openwa');

      const status = await getOpenWAStatus();

      expect(status.reachable).to.be.false;
      axiosGetStub.restore();
    });
  });
});
