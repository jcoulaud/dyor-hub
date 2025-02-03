import { registerAs } from '@nestjs/config';

export default registerAs('perspective', () => ({
  apiKey: process.env.PERSPECTIVE_API_KEY || '',
}));
