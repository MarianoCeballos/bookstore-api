import { Migration } from '@mikro-orm/migrations';

/**
 * Enforces case-insensitive uniqueness in the database for the values that
 * `BooksService` only checks in application code. Those pre-checks can race, so
 * the unique indexes below are the source of truth and let the service turn a
 * constraint violation into a 409 instead of a 500.
 */
export class Migration20261018120000 extends Migration {
  override async up(): Promise<void> {
    // Collapse duplicates written before the indexes existed. Links are
    // repointed at the surviving row; the delete cascades any leftover links
    // that were already pointing at it.

    // Authors: keep the lowest-ID author of each case-insensitive group.
    this.addSql(
      `update "books_authors" as ba set "author_id" = keepers."ID" from (select lower("name") as "key", min("ID") as "ID" from "authors" group by lower("name")) as keepers where ba."author_id" in (select a."ID" from "authors" as a where lower(a."name") = keepers."key" and a."ID" <> keepers."ID") and not exists (select 1 from "books_authors" as linked where linked."book_id" = ba."book_id" and linked."author_id" = keepers."ID");`,
    );
    this.addSql(
      `delete from "authors" as a using (select lower("name") as "key", min("ID") as "ID" from "authors" group by lower("name")) as keepers where lower(a."name") = keepers."key" and a."ID" <> keepers."ID";`,
    );

    // Categories: keep the lowest-ID category of each case-insensitive group.
    this.addSql(
      `update "books_categories" as bc set "category_id" = keepers."ID" from (select lower("category") as "key", min("ID") as "ID" from "categories" group by lower("category")) as keepers where bc."category_id" in (select c."ID" from "categories" as c where lower(c."category") = keepers."key" and c."ID" <> keepers."ID") and not exists (select 1 from "books_categories" as linked where linked."book_id" = bc."book_id" and linked."category_id" = keepers."ID");`,
    );
    this.addSql(
      `delete from "categories" as c using (select lower("category") as "key", min("ID") as "ID" from "categories" group by lower("category")) as keepers where lower(c."category") = keepers."key" and c."ID" <> keepers."ID";`,
    );

    // Books cannot be merged safely (reviews, orders and carts reference them),
    // so the oldest row keeps its title and every later duplicate is renamed to
    // a title that is still free (`text` vs `lower(title)` collisions included).
    this.addSql(`
      do $$
      declare
        duplicate record;
        candidate text;
        attempt int;
      begin
        for duplicate in
          select b."ID", b."title"
          from "books" as b
          where exists (
            select 1
            from "books" as older
            where lower(older."title") = lower(b."title") and older."ID" < b."ID"
          )
        loop
          attempt := 0;
          loop
            attempt := attempt + 1;
            candidate := left(duplicate."title", 980)
              || ' (' || duplicate."ID"
              || case when attempt > 1 then '-' || attempt else '' end
              || ')';
            exit when not exists (
              select 1
              from "books" as clash
              where lower(clash."title") = lower(candidate)
            );
          end loop;

          update "books" set "title" = candidate where "ID" = duplicate."ID";
        end loop;
      end $$;
    `);

    this.addSql(
      `create unique index "books_title_lower_unique" on "books" (lower("title"));`,
    );
    this.addSql(
      `create unique index "authors_name_lower_unique" on "authors" (lower("name"));`,
    );
    this.addSql(
      `create unique index "categories_category_lower_unique" on "categories" (lower("category"));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "books_title_lower_unique";`);
    this.addSql(`drop index if exists "authors_name_lower_unique";`);
    this.addSql(`drop index if exists "categories_category_lower_unique";`);
  }
}
