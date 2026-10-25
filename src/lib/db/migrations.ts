/*
 * Database migrations. Each entry runs once, in order, and is recorded in
 * `schema_migrations`. Never edit a migration that has already shipped —
 * add a new one at the end instead.
 */
export const migrations: { id: string; sql: string }[] = [
  {
    id: "001_initial",
    sql: /* sql */ `
      CREATE TABLE vehicles (
        id              serial PRIMARY KEY,
        slug            text NOT NULL UNIQUE,
        brand           text NOT NULL,
        model           text NOT NULL,
        trim_level      text,
        year            smallint NOT NULL,
        status          text NOT NULL CHECK (status IN ('IN_STOCK', 'IN_TRANSIT', 'PRE_ORDER')),
        fuel_type       text NOT NULL CHECK (fuel_type IN ('ELECTRIC', 'EREV', 'PHEV', 'HYBRID', 'PETROL')),
        body_type       text NOT NULL CHECK (body_type IN ('SEDAN', 'CROSSOVER', 'SUV', 'HATCHBACK', 'MPV', 'PICKUP')),
        drive           text NOT NULL CHECK (drive IN ('FWD', 'RWD', 'AWD')),
        horsepower      integer NOT NULL CHECK (horsepower > 0),
        ev_range_km     integer,
        battery_kwh     numeric(5, 1),
        accel_0_100     numeric(4, 1),
        top_speed_kmh   integer,
        seats           smallint NOT NULL DEFAULT 5,
        length_mm       integer,
        width_mm        integer,
        height_mm       integer,
        warranty_years  smallint NOT NULL DEFAULT 3,
        warranty_km     integer NOT NULL DEFAULT 100000,
        price_amd       bigint CHECK (price_amd IS NULL OR price_amd > 0),
        featured        boolean NOT NULL DEFAULT false,
        published       boolean NOT NULL DEFAULT true,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX vehicles_listing_idx ON vehicles (published, created_at DESC);
      CREATE INDEX vehicles_brand_idx ON vehicles (brand);

      -- Per-language text for a car (hy / en / ru).
      CREATE TABLE vehicle_translations (
        vehicle_id    integer NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        locale        text NOT NULL CHECK (locale IN ('hy', 'en', 'ru')),
        transmission  text,
        description   text,
        PRIMARY KEY (vehicle_id, locale)
      );

      -- Paint options; names are translated in vehicle_color_translations.
      CREATE TABLE vehicle_colors (
        id          serial PRIMARY KEY,
        vehicle_id  integer NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        hex         text NOT NULL CHECK (hex ~ '^#[0-9a-fA-F]{6}$'),
        position    smallint NOT NULL DEFAULT 0
      );
      CREATE INDEX vehicle_colors_vehicle_idx ON vehicle_colors (vehicle_id, position);

      CREATE TABLE vehicle_color_translations (
        color_id  integer NOT NULL REFERENCES vehicle_colors (id) ON DELETE CASCADE,
        locale    text NOT NULL CHECK (locale IN ('hy', 'en', 'ru')),
        name      text NOT NULL,
        PRIMARY KEY (color_id, locale)
      );

      -- Photos. color_id NULL = general photo of the car; otherwise a photo of that colour.
      CREATE TABLE vehicle_images (
        id          serial PRIMARY KEY,
        vehicle_id  integer NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        color_id    integer REFERENCES vehicle_colors (id) ON DELETE CASCADE,
        kind        text NOT NULL DEFAULT 'EXTERIOR' CHECK (kind IN ('EXTERIOR', 'INTERIOR')),
        url         text NOT NULL,
        alt         text,
        position    smallint NOT NULL DEFAULT 0
      );
      CREATE INDEX vehicle_images_vehicle_idx ON vehicle_images (vehicle_id, color_id, position);

      -- Requests from the site's forms.
      CREATE TABLE leads (
        id          serial PRIMARY KEY,
        type        text NOT NULL CHECK (type IN ('OFFER', 'FINANCING', 'CONTACT')),
        status      text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'DONE', 'SPAM')),
        name        text NOT NULL,
        phone       text NOT NULL,
        email       text,
        channel     text NOT NULL CHECK (channel IN ('WHATSAPP', 'PHONE', 'TELEGRAM', 'EMAIL')),
        message     text,
        vehicle_id  integer REFERENCES vehicles (id) ON DELETE SET NULL,
        locale      text NOT NULL CHECK (locale IN ('hy', 'en', 'ru')),
        consent     boolean NOT NULL,
        extra       jsonb,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX leads_created_idx ON leads (created_at DESC);
      CREATE INDEX leads_status_idx ON leads (status);

      -- People who can log in to the admin panel.
      CREATE TABLE admin_users (
        id             serial PRIMARY KEY,
        email          text NOT NULL UNIQUE,
        name           text,
        password_hash  text NOT NULL,
        role           text NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('ADMIN', 'EDITOR')),
        created_at     timestamptz NOT NULL DEFAULT now(),
        last_login_at  timestamptz
      );
    `,
  },
  {
    id: "002_admin",
    sql: /* sql */ `
      -- Two roles: FULL (everything) and SALES (only records sales).
      ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
      UPDATE admin_users SET role = CASE WHEN role = 'ADMIN' THEN 'FULL' ELSE 'SALES' END;
      ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'SALES';
      ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('FULL', 'SALES'));

      -- Login sessions. The id is a SHA-256 of the cookie token, so a DB leak can't be replayed.
      CREATE TABLE admin_sessions (
        id          text PRIMARY KEY,
        user_id     integer NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
        created_at  timestamptz NOT NULL DEFAULT now(),
        expires_at  timestamptz NOT NULL
      );
      CREATE INDEX admin_sessions_user_idx ON admin_sessions (user_id);

      -- Units available. NULL = not tracked (pre-order / in transit). At 0 the car is hidden from the site.
      ALTER TABLE vehicles ADD COLUMN stock integer CHECK (stock IS NULL OR stock >= 0);
      UPDATE vehicles SET stock = 1 WHERE status = 'IN_STOCK';

      -- Every sale a salesperson records. Names are copied so history survives edits and deletes.
      CREATE TABLE sales (
        id              serial PRIMARY KEY,
        vehicle_id      integer REFERENCES vehicles (id) ON DELETE SET NULL,
        vehicle_name    text NOT NULL,
        color_id        integer REFERENCES vehicle_colors (id) ON DELETE SET NULL,
        color_name      text,
        quantity        integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
        price_amd       bigint CHECK (price_amd IS NULL OR price_amd > 0),
        customer_name   text,
        customer_phone  text,
        note            text,
        stock_tracked   boolean NOT NULL,
        sold_by         integer REFERENCES admin_users (id) ON DELETE SET NULL,
        sold_by_name    text NOT NULL,
        created_at      timestamptz NOT NULL DEFAULT now(),
        cancelled_at    timestamptz,
        cancelled_by    text
      );
      CREATE INDEX sales_created_idx ON sales (created_at DESC);

      -- Hand-picked "You may also like" cars. Empty = automatic (same body type).
      CREATE TABLE vehicle_related (
        vehicle_id  integer NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        related_id  integer NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        position    smallint NOT NULL DEFAULT 0,
        PRIMARY KEY (vehicle_id, related_id),
        CHECK (vehicle_id <> related_id)
      );

      -- Editable site settings (contact info). Missing keys fall back to .env defaults.
      CREATE TABLE site_settings (
        key         text PRIMARY KEY,
        value       text NOT NULL,
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
  {
    id: "003_real_catalogue",
    sql: /* sql */ `
      -- Estate cars.
      ALTER TABLE vehicles DROP CONSTRAINT vehicles_body_type_check;
      ALTER TABLE vehicles ADD CONSTRAINT vehicles_body_type_check
        CHECK (body_type IN ('SEDAN', 'CROSSOVER', 'SUV', 'HATCHBACK', 'WAGON', 'MPV', 'PICKUP'));

      -- Optional links shown on the car page.
      ALTER TABLE vehicles ADD COLUMN interior_360_url text CHECK (interior_360_url IS NULL OR interior_360_url ~ '^https://');
      ALTER TABLE vehicles ADD COLUMN video_url text CHECK (video_url IS NULL OR video_url ~ '^https://');

      -- Where an imported car or photo came from, so an import can be re-run without duplicates.
      -- NULL for cars added in the admin.
      ALTER TABLE vehicles ADD COLUMN source text;
      ALTER TABLE vehicles ADD COLUMN source_id text;
      CREATE UNIQUE INDEX vehicles_source_idx ON vehicles (source, source_id) WHERE source IS NOT NULL;
      ALTER TABLE vehicle_images ADD COLUMN source_id text;

      -- A colour is either paint (exterior) or an interior trim; each has its own picker.
      ALTER TABLE vehicle_colors ADD COLUMN kind text NOT NULL DEFAULT 'EXTERIOR' CHECK (kind IN ('EXTERIOR', 'INTERIOR'));
      DROP INDEX vehicle_colors_vehicle_idx;
      CREATE INDEX vehicle_colors_vehicle_idx ON vehicle_colors (vehicle_id, kind, position);

      -- The photo used on catalogue cards. At most one per car.
      ALTER TABLE vehicle_images ADD COLUMN is_cover boolean NOT NULL DEFAULT false;
      CREATE UNIQUE INDEX vehicle_images_one_cover_idx ON vehicle_images (vehicle_id) WHERE is_cover;
    `,
  },
  {
    id: "004_transit_countdown",
    sql: /* sql */ `
      -- When a car on the road is expected. The site shows the days left (never below 1)
      -- while the car's status is IN_TRANSIT.
      ALTER TABLE vehicles ADD COLUMN arrival_date date;
    `,
  },
];
