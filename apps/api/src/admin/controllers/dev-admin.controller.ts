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

  /*
  // DEPRECATED: Endpoint to CREATE missing comments
  @Post('backfill-default-token-call-comments')
  async backfillDefaultComments() {
    const count = await this.devAdminService.backfillDefaultTokenCallComments();
    return { message: `Successfully created ${count} new default comments.` };
  }
  */

  /*
  // DEPRECATED: Endpoint to LINK existing comments
  @Post('link-existing-token-call-comments')
  async linkExistingComments() {
    const result = await this.devAdminService.linkExistingExplanationComments();
    return {
      message: 'Linking process finished.',
      updated: result.updatedCount,
      failed: result.failedCount,
      skippedAlreadyLinked: result.skippedAlreadyLinked,
      skippedNotFound: result.skippedNotFound,
    };
  }
  */

  // Endpoint to FIX timestamps
  @Post('fix-backfilled-comment-timestamps')
  async fixCommentTimestamps() {
    const result = await this.devAdminService.fixBackfilledCommentTimestamps();
    return {
      message: 'Timestamp fixing process finished.',
      updated: result.updatedCount,
      failed: result.failedCount,
    };
  }
}
