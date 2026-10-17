import { Migration } from '@mikro-orm/migrations';

export class Migration20261017174027 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "users" alter column "profile_pic" type text using ("profile_pic"::text);`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "users" alter column "profile_pic" type varchar(255) using ("profile_pic"::varchar(255));`,
    );
  }
}
