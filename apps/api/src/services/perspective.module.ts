import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import perspectiveConfig from '../config/perspective.config';
import { PerspectiveService } from './perspective.service';

@Module({
  imports: [ConfigModule.forFeature(perspectiveConfig)],
  providers: [PerspectiveService],
  exports: [PerspectiveService],
})
export class PerspectiveModule {}
