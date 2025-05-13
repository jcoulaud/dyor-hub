import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
