export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      claims: {
        Row: {
          cancelled_at: string | null
          claimed_at: string
          created_at: string
          delivery_location_id: string | null
          dropoff_address: string
          dropoff_area: string | null
          dropoff_contact_phone: string
          dropoff_instructions: string | null
          dropoff_latitude: number
          dropoff_longitude: number
          fulfilled_at: string | null
          id: string
          idempotency_key: string | null
          listing_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          claimed_at?: string
          created_at?: string
          delivery_location_id?: string | null
          dropoff_address: string
          dropoff_area?: string | null
          dropoff_contact_phone: string
          dropoff_instructions?: string | null
          dropoff_latitude: number
          dropoff_longitude: number
          fulfilled_at?: string | null
          id?: string
          idempotency_key?: string | null
          listing_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          claimed_at?: string
          created_at?: string
          delivery_location_id?: string | null
          dropoff_address?: string
          dropoff_area?: string | null
          dropoff_contact_phone?: string
          dropoff_instructions?: string | null
          dropoff_latitude?: number
          dropoff_longitude?: number
          fulfilled_at?: string | null
          id?: string
          idempotency_key?: string | null
          listing_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          assigned_at: string | null
          at_pickup_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          claim_id: string
          collected_at: string | null
          confirmed_receipt_at: string | null
          created_at: string
          donor_id: string
          en_route_dropoff_at: string | null
          handed_over_at: string | null
          id: string
          listing_id: string
          qc_failed_at: string | null
          qc_passed_at: string | null
          requester_id: string
          row_version: number
          status: string
          updated_at: string
          volunteer_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          at_pickup_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          claim_id: string
          collected_at?: string | null
          confirmed_receipt_at?: string | null
          created_at?: string
          donor_id: string
          en_route_dropoff_at?: string | null
          handed_over_at?: string | null
          id?: string
          listing_id: string
          qc_failed_at?: string | null
          qc_passed_at?: string | null
          requester_id: string
          row_version?: number
          status?: string
          updated_at?: string
          volunteer_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          at_pickup_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          claim_id?: string
          collected_at?: string | null
          confirmed_receipt_at?: string | null
          created_at?: string
          donor_id?: string
          en_route_dropoff_at?: string | null
          handed_over_at?: string | null
          id?: string
          listing_id?: string
          qc_failed_at?: string | null
          qc_passed_at?: string | null
          requester_id?: string
          row_version?: number
          status?: string
          updated_at?: string
          volunteer_id?: string | null
        }
        Relationships: []
      }
      delivery_locations: {
        Row: {
          accuracy_m: number
          captured_at: string
          created_at: string
          delivery_id: string
          id: string
          latitude: number
          longitude: number
          sequence: number
          volunteer_id: string
        }
        Insert: {
          accuracy_m: number
          captured_at: string
          created_at?: string
          delivery_id: string
          id?: string
          latitude: number
          longitude: number
          sequence: number
          volunteer_id: string
        }
        Update: {
          accuracy_m?: number
          captured_at?: string
          created_at?: string
          delivery_id?: string
          id?: string
          latitude?: number
          longitude?: number
          sequence?: number
          volunteer_id?: string
        }
        Relationships: []
      }
      delivery_qc: {
        Row: {
          checked_at: string
          delivery_id: string
          notes: string | null
          result: string
          volunteer_id: string
        }
        Insert: {
          checked_at?: string
          delivery_id: string
          notes?: string | null
          result: string
          volunteer_id: string
        }
        Update: {
          checked_at?: string
          delivery_id?: string
          notes?: string | null
          result?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      delivery_route_cache: {
        Row: {
          created_at: string
          delivery_id: string
          destination_latitude: number
          destination_longitude: number
          expires_at: string
          leg: string
          origin_latitude: number
          origin_longitude: number
          provider: string
          route: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          destination_latitude: number
          destination_longitude: number
          expires_at: string
          leg: string
          origin_latitude: number
          origin_longitude: number
          provider?: string
          route: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          destination_latitude?: number
          destination_longitude?: number
          expires_at?: string
          leg?: string
          origin_latitude?: number
          origin_longitude?: number
          provider?: string
          route?: Json
          updated_at?: string
        }
        Relationships: []
      }
      delivery_events: {
        Row: {
          actor_id: string
          actor_role: string
          created_at: string
          delivery_id: string
          event_name: string
          from_status: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_id: string
          actor_role: string
          created_at?: string
          delivery_id: string
          event_name: string
          from_status?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string
          actor_role?: string
          created_at?: string
          delivery_id?: string
          event_name?: string
          from_status?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reason?: string | null
          to_status?: string
        }
        Relationships: []
      }
      workflow_idempotency: {
        Row: {
          actor_id: string
          command_name: string
          created_at: string
          idempotency_key: string
          request_fingerprint: string
          resource_id: string
          response: Json
        }
        Insert: {
          actor_id: string
          command_name: string
          created_at?: string
          idempotency_key: string
          request_fingerprint: string
          resource_id: string
          response: Json
        }
        Update: {
          actor_id?: string
          command_name?: string
          created_at?: string
          idempotency_key?: string
          request_fingerprint?: string
          resource_id?: string
          response?: Json
        }
        Relationships: []
      }
      food_listings: {
        Row: {
          created_at: string
          description: string | null
          dietary_tags: string[]
          donor_id: string
          expires_at: string
          food_type: string
          general_area: string | null
          id: string
          pickup_location_id: string | null
          quantity: number
          row_version: number
          status: string
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dietary_tags?: string[]
          donor_id: string
          expires_at: string
          food_type: string
          general_area?: string | null
          id?: string
          pickup_location_id?: string | null
          quantity: number
          row_version?: number
          status?: string
          title: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dietary_tags?: string[]
          donor_id?: string
          expires_at?: string
          food_type?: string
          general_area?: string | null
          id?: string
          pickup_location_id?: string | null
          quantity?: number
          row_version?: number
          status?: string
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          display_order: number
          file_name: string
          file_size_bytes: number
          id: string
          listing_id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_name: string
          file_size_bytes: number
          id?: string
          listing_id: string
          mime_type: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_name?: string
          file_size_bytes?: number
          id?: string
          listing_id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: []
      }
      listing_pickup_details: {
        Row: {
          address_line2: string | null
          city: string | null
          contact_phone: string
          created_at: string
          id: string
          latitude: number
          listing_id: string
          longitude: number
          pickup_address: string
          pickup_instructions: string | null
          pickup_location_id: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line2?: string | null
          city?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          latitude: number
          listing_id: string
          longitude: number
          pickup_address: string
          pickup_instructions?: string | null
          pickup_location_id?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line2?: string | null
          city?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          latitude?: number
          listing_id?: string
          longitude?: number
          pickup_address?: string
          pickup_instructions?: string | null
          pickup_location_id?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          phone: string | null
          role: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_verified?: boolean
          phone?: string | null
          role: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_verified?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          latitude: number
          longitude: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          attempts_count: number
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          phone: string
          request_id: string
          resend_available_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          phone: string
          request_id: string
          resend_available_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          phone?: string
          request_id?: string
          resend_available_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_records: {
        Row: {
          created_at: string
          phone: string
          proof_id: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          phone: string
          proof_id: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          phone?: string
          proof_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      volunteer_preferences: {
        Row: {
          created_at: string
          is_available: boolean
          max_distance_km: number
          updated_at: string
          user_id: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          is_available?: boolean
          max_distance_km?: number
          updated_at?: string
          user_id: string
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          is_available?: boolean
          max_distance_km?: number
          updated_at?: string
          user_id?: string
          vehicle_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      users: {
        Row: {
          created_at: string | null
          earnings: number | null
          id: string | null
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          earnings?: never
          id?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          earnings?: never
          id?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_delivery_task: {
        Args: {
          p_delivery_id: string
          p_idempotency_key?: string | null
          p_volunteer_id: string
        }
        Returns: Json
      }
      accept_delivery_task_tx: {
        Args: {
          p_delivery_id: string
          p_idempotency_key?: string | null
          p_volunteer_id: string
        }
        Returns: Json
      }
      bootstrap_admin_user: {
        Args: {
          p_display_name?: string
          p_target_user_id: string
        }
        Returns: Json
      }
      cancel_verification_reservation: {
        Args: {
          p_reservation_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      claim_food_listing: {
        Args: {
          p_delivery_location_id?: string | null
          p_idempotency_key?: string | null
          p_listing_id: string
          p_requester_id: string
        }
        Returns: Json
      }
      claim_food_listing_tx: {
        Args: {
          p_delivery_location_id?: string | null
          p_idempotency_key?: string | null
          p_listing_id: string
          p_requester_id: string
        }
        Returns: Json
      }
      create_food_listing: {
        Args: {
          p_description: string | null
          p_dietary_tags: string[]
          p_donor_id: string
          p_expires_at: string
          p_food_type: string
          p_pickup_location_id: string
          p_prepared_image_token?: string | null
          p_publish_immediately?: boolean
          p_quantity: number
          p_title: string
          p_unit: string
        }
        Returns: Json
      }
      complete_onboarding_tx: {
        Args: {
          p_address?: string | null
          p_display_name: string
          p_latitude?: number | null
          p_location_label: string
          p_longitude?: number | null
          p_max_distance_km?: number
          p_role: string
          p_user_id: string
          p_vehicle_type?: string
        }
        Returns: Json
      }
      consume_verification_success: {
        Args: {
          p_proof_id: string
          p_request_id: string
          p_user_id: string
          p_verified_at: string
        }
        Returns: Json
      }
      finalize_verification_challenge: {
        Args: {
          p_expires_in_seconds: number
          p_request_id: string
          p_resend_after_seconds: number
          p_reservation_id: string
          p_user_id: string
        }
        Returns: Json
      }
      get_verification_challenge: {
        Args: {
          p_request_id?: string | null
          p_user_id: string
        }
        Returns: Json
      }
      record_verification_failure: {
        Args: {
          p_request_id: string
          p_user_id: string
        }
        Returns: Json
      }
      record_delivery_location: {
        Args: {
          p_accuracy_m: number
          p_captured_at: string
          p_delivery_id: string
          p_latitude: number
          p_longitude: number
          p_sequence: number
          p_volunteer_id: string
        }
        Returns: Json
      }
      transition_delivery: {
        Args: {
          p_action: string
          p_actor_id: string
          p_delivery_id: string
          p_expected_version?: number | null
          p_idempotency_key?: string | null
          p_payload?: Json
        }
        Returns: Json
      }
      update_food_listing: {
        Args: {
          p_changes: Json
          p_donor_id: string
          p_expected_version: number
          p_listing_id: string
        }
        Returns: Json
      }
      reserve_verification_challenge: {
        Args: {
          p_idempotency_key: string
          p_phone: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
