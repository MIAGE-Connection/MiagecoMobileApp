export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  image_url?: string;
  instagram_url?: string;
  association_id?: string;
  max_attendees?: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}
