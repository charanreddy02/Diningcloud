/*
# Restaurant Management Platform - Initial Database Schema
This migration creates the complete database structure for the restaurant management and POS system.

## Query Description: 
This operation creates all essential tables and relationships for restaurant management including user profiles, restaurants, branches, tables, menu items, orders, and bills. It establishes proper foreign key relationships, Row Level Security (RLS) policies, and automated triggers for profile creation. This is a safe initial setup that creates the foundation for the entire application.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- profiles (user management with roles)
- restaurants (restaurant information)
- branches (multi-location support)
- tables (table management with QR codes)
- menu_items (menu management)
- orders (order processing and tracking)
- bills (billing and payment tracking)

## Security Implications:
- RLS Status: Enabled on all public tables
- Policy Changes: Yes - comprehensive RLS policies
- Auth Requirements: Integration with Supabase Auth

## Performance Impact:
- Indexes: Added for foreign keys and common queries
- Triggers: Profile creation trigger on auth.users
- Estimated Impact: Minimal - initial setup only
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'waiter', 'kitchen', 'cashier')),
    restaurant_id UUID,
    branch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    phone TEXT,
    address TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    table_number INTEGER NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, table_number)
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    variants JSONB DEFAULT '[]',
    add_ons JSONB DEFAULT '[]',
    available BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    source TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'pos', 'online')),
    customer_name TEXT,
    customer_phone TEXT,
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    prepared_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints to profiles table
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_restaurant 
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_branch 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_branches_restaurant_id ON branches(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch_id ON tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON bills(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_id ON profiles(restaurant_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for restaurants
CREATE POLICY "Owners can manage their restaurants" ON restaurants FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Restaurant staff can view their restaurant" ON restaurants FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.restaurant_id = restaurants.id
    )
);

-- Create RLS policies for branches
CREATE POLICY "Restaurant owners can manage branches" ON branches FOR ALL USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = branches.restaurant_id AND restaurants.owner_id = auth.uid()
    )
);
CREATE POLICY "Restaurant staff can view branches" ON branches FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.restaurant_id = branches.restaurant_id
    )
);

-- Create RLS policies for tables
CREATE POLICY "Restaurant team can manage tables" ON tables FOR ALL USING (
    EXISTS (
        SELECT 1 FROM branches b
        JOIN restaurants r ON r.id = b.restaurant_id
        WHERE b.id = tables.branch_id AND (
            r.owner_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = r.id)
        )
    )
);

-- Create RLS policies for menu_items
CREATE POLICY "Restaurant team can manage menu items" ON menu_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = menu_items.restaurant_id AND (
            restaurants.owner_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = restaurants.id)
        )
    )
);

-- Create RLS policies for orders
CREATE POLICY "Restaurant team can manage orders" ON orders FOR ALL USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = orders.restaurant_id AND (
            restaurants.owner_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = restaurants.id)
        )
    )
);

-- Create RLS policies for bills
CREATE POLICY "Restaurant team can manage bills" ON bills FOR ALL USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE o.id = bills.order_id AND (
            r.owner_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = r.id)
        )
    )
);

-- Create trigger function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'fullName',
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
