import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddCommentIdRelationToTokenCalls1745178476869
  implements MigrationInterface
{
  name = 'AddCommentIdRelationToTokenCalls1745178476869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'token_calls',
      new TableColumn({
        name: 'explanation_comment_id',
        type: 'uuid',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'token_calls',
      new TableForeignKey({
        name: 'FK_token_calls_explanation_comment_id',
        columnNames: ['explanation_comment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'comments',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'token_calls',
      new TableIndex({
        name: 'IDX_token_calls_explanation_comment_id',
        columnNames: ['explanation_comment_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'token_calls',
      'IDX_token_calls_explanation_comment_id',
    );
    await queryRunner.dropForeignKey(
      'token_calls',
      'FK_token_calls_explanation_comment_id',
    );
    await queryRunner.dropColumn('token_calls', 'explanation_comment_id');
  }
}
