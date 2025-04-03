import { Expose, Type } from 'class-transformer';
import { CommentResponseDto } from './comment-response.dto';

export class CommentThreadResponseDto {
  @Expose()
  @Type(() => CommentResponseDto)
  rootComment: CommentResponseDto;

  @Expose()
  @Type(() => CommentResponseDto)
  comments: CommentResponseDto[];

  @Expose()
  focusedCommentId: string;
}
