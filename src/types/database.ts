export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          phone: string;
          address: string;
          gstin?: string;
          cgst_rate?: number;
          sgst_rate?: number;
          payment_enabled?: boolean;
          upi_qr_code?: string;
          bank_details?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          phone: string;
          address: string;
          gstin?: string;
          cgst_rate?: number;
          sgst_rate?: number;
          payment_enabled?: boolean;
          upi_qr_code?: string;
          bank_details?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          phone?: string;
          address?: string;
          gstin?: string;
          cgst_rate?: number;
          sgst_rate?: number;
          payment_enabled?: boolean;
          upi_qr_code?: string;
          bank_details?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier';
          restaurant_id?: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier';
          restaurant_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier';
          restaurant_id?: string;
          created_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          address?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          address?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          address?: string;
          created_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          branch_id: string;
          table_number: string;
          capacity: number;
          qr_code: string;
          status: 'available' | 'occupied' | 'reserved';
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          branch_id: string;
          table_number: string;
          capacity: number;
          qr_code: string;
          status?: 'available' | 'occupied' | 'reserved';
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          branch_id?: string;
          table_number?: string;
          capacity?: number;
          qr_code?: string;
          status?: 'available' | 'occupied' | 'reserved';
          created_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id?: string;
          name: string;
          description?: string;
          price: number;
          category: string;
          image_url?: string;
          available: boolean;
          variants: any[];
          add_ons: any[];
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string;
          name: string;
          description?: string;
          price: number;
          category: string;
          image_url?: string;
          available?: boolean;
          variants?: any[];
          add_ons?: any[];
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image_url?: string;
          available?: boolean;
          variants?: any[];
          add_ons?: any[];
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          customer_name?: string;
          customer_phone?: string;
          items: any[];
          total_amount: number;
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
          special_instructions?: string;
          source: 'online' | 'pos' | 'phone';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          customer_name?: string;
          customer_phone?: string;
          items: any[];
          total_amount: number;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
          special_instructions?: string;
          source: 'online' | 'pos' | 'phone';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string;
          customer_name?: string;
          customer_phone?: string;
          items?: any[];
          total_amount?: number;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
          special_instructions?: string;
          source?: 'online' | 'pos' | 'phone';
          created_at?: string;
          updated_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          order_id: string;
          restaurant_id: string;
          subtotal: number;
          cgst_amount: number;
          sgst_amount: number;
          total_amount: number;
          payment_status: 'pending' | 'paid' | 'failed';
          payment_method?: 'cash' | 'upi' | 'card';
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          restaurant_id: string;
          subtotal: number;
          cgst_amount: number;
          sgst_amount: number;
          total_amount: number;
          payment_status?: 'pending' | 'paid' | 'failed';
          payment_method?: 'cash' | 'upi' | 'card';
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          restaurant_id?: string;
          subtotal?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          total_amount?: number;
          payment_status?: 'pending' | 'paid' | 'failed';
          payment_method?: 'cash' | 'upi' | 'card';
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          restaurant_id: string;
          table_id: string;
          customer_name: string;
          utr_number: string;
          amount: number;
          status: 'pending' | 'verified' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          restaurant_id: string;
          table_id: string;
          customer_name: string;
          utr_number: string;
          amount: number;
          status?: 'pending' | 'verified' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          restaurant_id?: string;
          table_id?: string;
          customer_name?: string;
          utr_number?: string;
          amount?: number;
          status?: 'pending' | 'verified' | 'failed';
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          phone?: string;
          email?: string;
          total_orders: number;
          total_spent: number;
          last_visit: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          phone?: string;
          email?: string;
          total_orders?: number;
          total_spent?: number;
          last_visit: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          phone?: string;
          email?: string;
          total_orders?: number;
          total_spent?: number;
          last_visit?: string;
          created_at?: string;
        };
      };
    };
  };
}
