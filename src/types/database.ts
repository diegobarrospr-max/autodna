export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FuelType = 'flex' | 'gasolina' | 'diesel' | 'hibrido' | 'eletrico';
export type Transmission = 'manual' | 'automatico' | 'cvt' | 'automatizado';
export type BodyType =
  | 'hatch'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'minivan'
  | 'crossover';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          monthly_income: number | null;
          city: string | null;
          state: string | null;
          household_size: number | null;
          parking_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          monthly_income?: number | null;
          city?: string | null;
          state?: string | null;
          household_size?: number | null;
          parking_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          monthly_income?: number | null;
          city?: string | null;
          state?: string | null;
          household_size?: number | null;
          parking_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cars: {
        Row: {
          id: string;
          brand: string;
          model: string;
          version: string;
          year: number;
          body_type: BodyType;
          fuel: FuelType;
          transmission: Transmission;
          engine_displacement: number | null;
          horsepower: number | null;
          price_fipe: number;
          fuel_consumption_city: number | null;
          fuel_consumption_road: number | null;
          seats: number;
          trunk_liters: number | null;
          tags: string[];
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['cars']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cars']['Insert']>;
      };
      car_costs: {
        Row: {
          car_id: string;
          insurance_yearly: number;
          maintenance_yearly: number;
          ipva_yearly: number;
          depreciation_yearly: number;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['car_costs']['Row'];
        Update: Partial<Database['public']['Tables']['car_costs']['Row']>;
      };
      matches: {
        Row: {
          id: string;
          user_id: string;
          car_id: string;
          score: number;
          rank: number;
          reason: string | null;
          generated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['matches']['Row'],
          'id' | 'generated_at'
        > & {
          id?: string;
          generated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      fuel_type: FuelType;
      transmission_type: Transmission;
      body_type: BodyType;
    };
  };
}
