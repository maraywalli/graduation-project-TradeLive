export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Item>;
      };
      brands: {
        Row: Brand;
        Insert: Omit<Brand, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Brand>;
      };
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<EventRow>;
      };
      tickets: {
        Row: Ticket;
        Insert: Omit<Ticket, 'id' | 'purchased_at' | 'qr_code'> & { id?: string };
        Update: Partial<Ticket>;
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Course>;
      };
      course_enrollments: {
        Row: CourseEnrollment;
        Insert: Omit<CourseEnrollment, 'id' | 'enrolled_at'> & { id?: string };
        Update: Partial<CourseEnrollment>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Order>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Message>;
      };
      deliveries: {
        Row: Delivery;
        Insert: Omit<Delivery, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Delivery>;
      };
    };
  };
};

export type UserRole = 'user' | 'seller' | 'brand' | 'delivery' | 'admin';
export type Tier = 'free' | 'premium' | 'gold';

export type Profile = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  tier: Tier;
  rating: number;
  sales_count: number;
  language: 'ku' | 'en';
  created_at: string;
};

export type Item = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'used';
  category: string;
  images: string[];
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'active' | 'sold' | 'archived';
  created_at: string;
  updated_at: string;
};

export type Brand = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  verified: boolean;
  platform_fee: number;
  rating: number;
  sales_count: number;
  created_at: string;
};

export type EventRow = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  venue: string;
  starts_at: string;
  ends_at: string | null;
  ticket_price: number;
  total_tickets: number;
  tickets_sold: number;
  created_at: string;
};

export type Ticket = {
  id: string;
  event_id: string;
  user_id: string;
  qr_code: string;
  status: 'valid' | 'used' | 'refunded';
  purchased_at: string;
};

export type Course = {
  id: string;
  instructor_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  category: string;
  content_url: string | null;
  duration_minutes: number;
  created_at: string;
};

export type CourseEnrollment = {
  id: string;
  course_id: string;
  user_id: string;
  progress: number;
  enrolled_at: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
};

export type Delivery = {
  id: string;
  order_id: string | null;
  user_id: string;
  pickup_address: string;
  drop_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  drop_lat: number | null;
  drop_lng: number | null;
  driver_lat: number | null;
  driver_lng: number | null;
  status: 'requested' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  driver_name: string | null;
  driver_phone: string | null;
  cost: number;
  eta_minutes: number | null;
  created_at: string;
};
