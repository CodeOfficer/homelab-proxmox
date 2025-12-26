import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'spotify-web');
    expect(response.body).toHaveProperty('timestamp');
  });
});
