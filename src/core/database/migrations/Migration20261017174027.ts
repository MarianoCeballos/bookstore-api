import { Migration } from '@mikro-orm/migrations';

export class Migration20261017174027 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "users" alter column "profile_pic" type text using ("profile_pic"::text);`,
    );
  }

  override async down(): Promise<void> {
    // PostgreSQL truncates oversized values silently instead of failing, which
    // would corrupt the base64 data URLs stored by the upload endpoint. Clear
    // the affected rows before narrowing the column back to varchar(255).
    this.addSql(
      `update "users" set "profile_pic" = null where length("profile_pic") > 255;`,
    );
    this.addSql(
      `alter table "users" alter column "profile_pic" type varchar(255);`,
    );
  }
}
