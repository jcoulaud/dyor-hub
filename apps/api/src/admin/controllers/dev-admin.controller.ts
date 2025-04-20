import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../admin.guard';
import { DevAdminService } from '../services/dev-admin.service';

@Controller('admin/dev')
@UseGuards(AuthGuard, AdminGuard)
export class DevAdminController {
  constructor(
    @Inject(DevAdminService) private readonly devAdminService: DevAdminService,
  ) {}

  @Post('backfill-default-token-call-comments')
  async backfillDefaultComments() {
    const count = await this.devAdminService.backfillDefaultTokenCallComments();
    return { message: `Successfully backfilled ${count} default comments.` };
  }
}
