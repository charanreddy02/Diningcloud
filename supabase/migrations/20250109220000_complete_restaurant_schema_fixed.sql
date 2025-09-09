/*
# Complete Restaurant Management Schema - Fixed Migration

This migration creates the complete database schema for the Restaurant Management & POS SaaS platform.
It handles existing objects gracefully and ensures a clean, consistent database state.

## Query Description: 
This operation creates all necessary tables, relationships, and security policies for the restaurant management platform. It safely handles existing objects and ensures data integrity. The migration includes role-based access controls and automated triggers for optimal performance.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true

## Structure Details:
Creates tables: profiles, restaurants, branches, tables, menu_items, orders, bills
Adds indexes, triggers, RLS policies, and foreign key relationships

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes
- Auth Requirements: Full role-based access control

## Performance Impact:
- Indexes: Added strategic indexes for performance
- Triggers: Added update timestamp triggers
- Estimated Impact: Optimized for restaurant operations
*/

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing objects if they exist to ensure clean state
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tables with proper structure

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'waiter', 'kitchen', 'cashier')),
    restaurant_id UUID,
    branch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone TEXT,
    address TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    table_number INTEGER NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, table_number)
);

-- Menu items table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    source TEXT DEFAULT 'qr' CHECK (source IN ('qr', 'pos', 'online')),
    customer_name TEXT,
    customer_phone TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    prepared_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for profiles table
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_restaurant_id_fkey,
ADD CONSTRAINT profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_branch_id_fkey,
ADD CONSTRAINT profiles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

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

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Restaurant staff can view profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can update own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public can view restaurant basic info" ON restaurants;

DROP POLICY IF EXISTS "Restaurant staff can view branches" ON branches;
DROP POLICY IF EXISTS "Restaurant owners can manage branches" ON branches;

DROP POLICY IF EXISTS "Restaurant staff can view tables" ON tables;
DROP POLICY IF EXISTS "Restaurant staff can manage tables" ON tables;

DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Restaurant staff can manage menu items" ON menu_items;

DROP POLICY IF EXISTS "Restaurant staff can view orders" ON orders;
DROP POLICY IF EXISTS "Restaurant staff can manage orders" ON orders;
DROP POLICY IF EXISTS "Customers can create orders" ON orders;

DROP POLICY IF EXISTS "Restaurant staff can view bills" ON bills;
DROP POLICY IF EXISTS "Restaurant staff can manage bills" ON bills;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Restaurant staff can view profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.owner_id = auth.uid() 
            AND r.id = profiles.restaurant_id
        )
    );

-- Restaurants policies
CREATE POLICY "Users can view own restaurants" ON restaurants
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public can view restaurant basic info" ON restaurants
    FOR SELECT USING (true);

-- Branches policies
CREATE POLICY "Restaurant staff can view branches" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = branches.restaurant_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

CREATE POLICY "Restaurant owners can manage branches" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = branches.restaurant_id 
            AND r.owner_id = auth.uid()
        )
    );

-- Tables policies
CREATE POLICY "Restaurant staff can view tables" ON tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branches b 
            JOIN restaurants r ON r.id = b.restaurant_id 
            WHERE b.id = tables.branch_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

CREATE POLICY "Restaurant staff can manage tables" ON tables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM branches b 
            JOIN restaurants r ON r.id = b.restaurant_id 
            WHERE b.id = tables.branch_id 
            AND r.owner_id = auth.uid()
        )
    );

-- Menu items policies
CREATE POLICY "Public can view available menu items" ON menu_items
    FOR SELECT USING (available = true);

CREATE POLICY "Restaurant staff can manage menu items" ON menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = menu_items.restaurant_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

-- Orders policies
CREATE POLICY "Restaurant staff can view orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = orders.restaurant_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

CREATE POLICY "Restaurant staff can manage orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r 
            WHERE r.id = orders.restaurant_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Bills policies
CREATE POLICY "Restaurant staff can view bills" ON bills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN restaurants r ON r.id = o.restaurant_id 
            WHERE o.id = bills.order_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

CREATE POLICY "Restaurant staff can manage bills" ON bills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN restaurants r ON r.id = o.restaurant_id 
            WHERE o.id = bills.order_id 
            AND (r.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = auth.uid() 
                AND p.restaurant_id = r.id
            ))
        )
    );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
