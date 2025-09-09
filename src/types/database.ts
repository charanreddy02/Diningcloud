export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          phone?: string
          address?: string
          description?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          phone?: string
          address?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          phone?: string
          address?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          location?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          location?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          location?: string
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          branch_id: string
          table_number: number
          qr_code_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          table_number: number
          qr_code_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          table_number?: number
          qr_code_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category: string
          name: string
          description?: string
          price: number
          variants?: Json
          add_ons?: Json
          available: boolean
          image_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category: string
          name: string
          description?: string
          price: number
          variants?: Json
          add_ons?: Json
          available?: boolean
          image_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          category?: string
          name?: string
          description?: string
          price?: number
          variants?: Json
          add_ons?: Json
          available?: boolean
          image_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_id?: string
          items: Json
          total: number
          status: string
          source: string
          customer_name?: string
          customer_phone?: string
          special_instructions?: string
          created_at: string
          updated_at: string
          prepared_at?: string
          served_at?: string
          completed_at?: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_id?: string
          items: Json
          total: number
          status?: string
          source?: string
          customer_name?: string
          customer_phone?: string
          special_instructions?: string
          created_at?: string
          updated_at?: string
          prepared_at?: string
          served_at?: string
          completed_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_id?: string
          items?: Json
          total?: number
          status?: string
          source?: string
          customer_name?: string
          customer_phone?: string
          special_instructions?: string
          created_at?: string
          updated_at?: string
          prepared_at?: string
          served_at?: string
          completed_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          order_id: string
          total: number
          status: string
          pdf_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          total: number
          status?: string
          pdf_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          total?: number
          status?: string
          pdf_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name?: string
          role: string
          restaurant_id?: string
          branch_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          role?: string
          restaurant_id?: string
          branch_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          restaurant_id?: string
          branch_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
