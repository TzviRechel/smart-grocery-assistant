create extension if not exists "pgcrypto";

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_category_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (owner_id, parent_category_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  barcode text,
  package_size numeric(12, 3) check (package_size is null or package_size > 0),
  package_unit text check (package_unit is null or package_unit in ('g', 'kg', 'ml', 'l', 'unit')),
  image_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_owner_barcode_idx
  on public.products (owner_id, barcode)
  where barcode is not null;
create index products_owner_name_idx on public.products (owner_id, name);
create index products_owner_category_idx on public.products (owner_id, category_id);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  chain_name text not null check (char_length(trim(chain_name)) > 0),
  branch_name text,
  location text,
  created_at timestamptz not null default now(),
  unique (owner_id, chain_name, branch_name, location)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  purchase_date date not null,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  receipt_number text,
  original_file_path text,
  processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded', 'processing', 'needs_review', 'confirmed', 'failed')),
  created_at timestamptz not null default now()
);

create index receipts_owner_date_idx on public.receipts (owner_id, purchase_date desc);
create index receipts_owner_store_idx on public.receipts (owner_id, store_id);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  original_item_name text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  original_total_price numeric(12, 2) check (original_total_price is null or original_total_price >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  final_price numeric(12, 2) not null check (final_price >= 0),
  is_promotion boolean not null default false,
  ocr_confidence numeric(5, 4) check (ocr_confidence is null or ocr_confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create index purchase_items_receipt_idx on public.purchase_items (receipt_id);
create index purchase_items_product_idx on public.purchase_items (product_id);

create table public.price_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  observed_price numeric(12, 2) not null check (observed_price >= 0),
  observed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index price_observations_owner_product_idx
  on public.price_observations (owner_id, product_id, observed_at desc);

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stores enable row level security;
alter table public.receipts enable row level security;
alter table public.purchase_items enable row level security;
alter table public.price_observations enable row level security;

create policy "owners manage their brands"
  on public.brands for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their categories"
  on public.categories for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their products"
  on public.products for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their stores"
  on public.stores for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their receipts"
  on public.receipts for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their price observations"
  on public.price_observations for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners manage their purchase items"
  on public.purchase_items for all to authenticated
  using (
    exists (
      select 1
      from public.receipts
      where receipts.id = purchase_items.receipt_id
        and receipts.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.receipts
      where receipts.id = purchase_items.receipt_id
        and receipts.owner_id = auth.uid()
    )
  );
