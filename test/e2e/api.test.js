const request = require('supertest');
const { expect } = require('chai');
const { setupTestConfig, testConfig } = require('../helpers');
const { app } = require('../../src/index');

// Ensure config exists
setupTestConfig();

describe('API E2E Tests', () => {
  it('should return restaurant config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('name', 'Test Restaurant');
    expect(res.body).to.have.property('menu').that.is.an('array');
  });

  it('should include opening hours', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).to.equal(200);
    expect(res.body.openingHours).to.have.property('Monday');
  });

  it('should update and persist config', async () => {
    const newMenu = [
      { id: "3", category: "Desserts", name: "Cheesecake", price: 7.99 }
    ];
    const updatedConfig = { ...testConfig, menu: newMenu };

    const res = await request(app)
      .post('/api/config')
      .send(updatedConfig);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;

    // Verify saved
    const getRes = await request(app).get('/api/config');
    expect(getRes.body.menu).to.have.lengthOf(1);
    expect(getRes.body.menu[0].name).to.equal('Cheesecake');
  });

  it('should return bookings array', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });
});
