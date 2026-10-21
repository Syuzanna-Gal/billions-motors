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
];
