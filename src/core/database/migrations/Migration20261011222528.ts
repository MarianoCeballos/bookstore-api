import { Migration } from '@mikro-orm/migrations';

export class Migration20261011222528 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create type "user_role" as enum ('user', 'admin');`);
    this.addSql(
      `create type "order_status" as enum ('pending', 'approved', 'rejected', 'cancelled');`,
    );
    this.addSql(
      `create table "authors" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "name" varchar(255) not null);`,
    );
    this.addSql(
      `alter table "authors" add constraint "authors_name_unique" unique ("name");`,
    );

    this.addSql(
      `create table "books" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "title" varchar(1000) not null, "description" text not null, "price" numeric(12,2) not null, "image" text null, "publisher" varchar(255) null, "published_date" varchar(255) null, "page_count" int null, "rating" varchar(255) null, "language" varchar(255) null, "avg_reading_time" varchar(255) null, "sold_copies" int not null default 0);`,
    );

    this.addSql(
      `create table "books_authors" ("book_id" int not null, "author_id" int not null, constraint "books_authors_pkey" primary key ("book_id", "author_id"));`,
    );

    this.addSql(
      `create table "categories" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "category" varchar(255) not null, "sold_copies" int not null default 0);`,
    );
    this.addSql(
      `alter table "categories" add constraint "categories_category_unique" unique ("category");`,
    );

    this.addSql(
      `create table "books_categories" ("book_id" int not null, "category_id" int not null, constraint "books_categories_pkey" primary key ("book_id", "category_id"));`,
    );

    this.addSql(
      `create table "users" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "name" varchar(255) not null, "surname" varchar(255) not null, "username" varchar(255) not null, "email" varchar(255) not null, "profile_pic" varchar(255) null, "password_hash" varchar(255) null, "enabled" boolean not null default false, "banned" boolean not null default false, "suspended_times" int not null default 0, "date_suspended" timestamptz null, "role" "user_role" not null default 'user', "confirmation_token_hash" varchar(255) null, "confirmation_token_expires_at" timestamptz null, "reset_code_hash" varchar(255) null, "reset_code_expires_at" timestamptz null);`,
    );
    this.addSql(
      `alter table "users" add constraint "users_username_unique" unique ("username");`,
    );
    this.addSql(
      `alter table "users" add constraint "users_email_unique" unique ("email");`,
    );

    this.addSql(
      `create table "reviews" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "title" varchar(20) not null, "review" varchar(255) not null, "rating" int not null, "book_ID" int not null, "user_ID" int not null);`,
    );

    this.addSql(
      `create table "review_reports" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "review_ID" int not null, "user_ID" int not null);`,
    );
    this.addSql(
      `alter table "review_reports" add constraint "review_reports_review_ID_user_ID_unique" unique ("review_ID", "user_ID");`,
    );

    this.addSql(
      `create table "orders" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "provider_payment_id" varchar(255) null, "provider_preference_id" varchar(255) null, "status" "order_status" not null default 'pending', "total" numeric(12,2) not null, "gift" boolean not null default false, "gift_recipient" varchar(255) null, "receipt_sent_at" timestamptz null, "ebooks_sent_at" timestamptz null, "user_ID" int not null);`,
    );
    this.addSql(
      `alter table "orders" add constraint "orders_provider_payment_id_unique" unique ("provider_payment_id");`,
    );
    this.addSql(
      `alter table "orders" add constraint "orders_provider_preference_id_unique" unique ("provider_preference_id");`,
    );

    this.addSql(
      `create table "order_items" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "order_ID" int not null, "book_ID" int not null, "title" varchar(1000) not null, "unit_price" numeric(12,2) not null, "quantity" int not null default 1);`,
    );

    this.addSql(
      `create table "favorites" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "user_ID" int not null, "book_ID" int not null);`,
    );
    this.addSql(
      `alter table "favorites" add constraint "favorites_user_ID_book_ID_unique" unique ("user_ID", "book_ID");`,
    );

    this.addSql(
      `create table "cart_items" ("ID" serial primary key, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "user_ID" int not null, "book_ID" int not null);`,
    );
    this.addSql(
      `alter table "cart_items" add constraint "cart_items_user_ID_book_ID_unique" unique ("user_ID", "book_ID");`,
    );

    this.addSql(
      `alter table "books_authors" add constraint "books_authors_book_id_foreign" foreign key ("book_id") references "books" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "books_authors" add constraint "books_authors_author_id_foreign" foreign key ("author_id") references "authors" ("ID") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "books_categories" add constraint "books_categories_book_id_foreign" foreign key ("book_id") references "books" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "books_categories" add constraint "books_categories_category_id_foreign" foreign key ("category_id") references "categories" ("ID") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "reviews" add constraint "reviews_book_ID_foreign" foreign key ("book_ID") references "books" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "reviews" add constraint "reviews_user_ID_foreign" foreign key ("user_ID") references "users" ("ID") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "review_reports" add constraint "review_reports_review_ID_foreign" foreign key ("review_ID") references "reviews" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "review_reports" add constraint "review_reports_user_ID_foreign" foreign key ("user_ID") references "users" ("ID") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "orders" add constraint "orders_user_ID_foreign" foreign key ("user_ID") references "users" ("ID") on update cascade on delete restrict;`,
    );

    this.addSql(
      `alter table "order_items" add constraint "order_items_order_ID_foreign" foreign key ("order_ID") references "orders" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "order_items" add constraint "order_items_book_ID_foreign" foreign key ("book_ID") references "books" ("ID") on update cascade on delete restrict;`,
    );

    this.addSql(
      `alter table "favorites" add constraint "favorites_user_ID_foreign" foreign key ("user_ID") references "users" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "favorites" add constraint "favorites_book_ID_foreign" foreign key ("book_ID") references "books" ("ID") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "cart_items" add constraint "cart_items_user_ID_foreign" foreign key ("user_ID") references "users" ("ID") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "cart_items" add constraint "cart_items_book_ID_foreign" foreign key ("book_ID") references "books" ("ID") on update cascade on delete cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "books_authors" drop constraint "books_authors_author_id_foreign";`,
    );

    this.addSql(
      `alter table "books_authors" drop constraint "books_authors_book_id_foreign";`,
    );

    this.addSql(
      `alter table "books_categories" drop constraint "books_categories_book_id_foreign";`,
    );

    this.addSql(
      `alter table "reviews" drop constraint "reviews_book_ID_foreign";`,
    );

    this.addSql(
      `alter table "order_items" drop constraint "order_items_book_ID_foreign";`,
    );

    this.addSql(
      `alter table "favorites" drop constraint "favorites_book_ID_foreign";`,
    );

    this.addSql(
      `alter table "cart_items" drop constraint "cart_items_book_ID_foreign";`,
    );

    this.addSql(
      `alter table "books_categories" drop constraint "books_categories_category_id_foreign";`,
    );

    this.addSql(
      `alter table "reviews" drop constraint "reviews_user_ID_foreign";`,
    );

    this.addSql(
      `alter table "review_reports" drop constraint "review_reports_user_ID_foreign";`,
    );

    this.addSql(
      `alter table "orders" drop constraint "orders_user_ID_foreign";`,
    );

    this.addSql(
      `alter table "favorites" drop constraint "favorites_user_ID_foreign";`,
    );

    this.addSql(
      `alter table "cart_items" drop constraint "cart_items_user_ID_foreign";`,
    );

    this.addSql(
      `alter table "review_reports" drop constraint "review_reports_review_ID_foreign";`,
    );

    this.addSql(
      `alter table "order_items" drop constraint "order_items_order_ID_foreign";`,
    );

    this.addSql(`drop table if exists "authors" cascade;`);

    this.addSql(`drop table if exists "books" cascade;`);

    this.addSql(`drop table if exists "books_authors" cascade;`);

    this.addSql(`drop table if exists "categories" cascade;`);

    this.addSql(`drop table if exists "books_categories" cascade;`);

    this.addSql(`drop table if exists "users" cascade;`);

    this.addSql(`drop table if exists "reviews" cascade;`);

    this.addSql(`drop table if exists "review_reports" cascade;`);

    this.addSql(`drop table if exists "orders" cascade;`);

    this.addSql(`drop table if exists "order_items" cascade;`);

    this.addSql(`drop table if exists "favorites" cascade;`);

    this.addSql(`drop table if exists "cart_items" cascade;`);

    this.addSql(`drop type "user_role";`);
    this.addSql(`drop type "order_status";`);
  }
}
