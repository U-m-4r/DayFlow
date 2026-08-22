import request from 'supertest';
import app from '../src/app';
describe('health endpoint',()=>{
  it('reports API readiness',async()=>{
    const response=await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({status:'ok'});
  });
  it('returns JSON for an unknown route',async()=>{
    const response=await request(app).get('/api/v1/not-here');
    expect(response.status).toBe(404);
    expect(response.body.message).toBeTruthy();
  });
});
