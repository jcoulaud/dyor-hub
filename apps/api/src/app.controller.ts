import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Redirect('/health', 302)
  redirectToHealth() {
    return { url: '/health' };
  }
}
