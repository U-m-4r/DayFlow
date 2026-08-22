import request from 'supertest';
import app from '../src/app';

describe('chatbot endpoint', () => {
  it('returns a reply for valid user question', async () => {
    const response = await request(app)
      .post('/api/v1/chatbot/chat')
      .send({ message: 'How do I apply for leave?' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reply');
    expect(typeof response.body.reply).toBe('string');
    expect(response.body.reply.length).toBeGreaterThan(0);
  });

  it('rejects empty message payload', async () => {
    const response = await request(app)
      .post('/api/v1/chatbot/chat')
      .send({ message: '' });

    expect(response.status).toBe(400);
  });
});
