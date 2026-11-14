export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

export interface BookingRecord {
  id: number;
  referenceCode: string;
  bookingDate: string; // YYYY-MM-DD
  startHour: number; // 6..22
  durationHours: number; // 1..3
  customerName: string;
  mobileNumber: string;
  playersCount: number;
  specialRequests: string;
  totalAmountInr: number | null;
  status: BookingStatus;
  createdAt: string;
}

export interface BlockedSlotRecord {
  id: number;
  blockDate: string; // YYYY-MM-DD
  startHour: number;
  reason: string;
  createdAt: string;
}

export interface PricingConfig {
  hourlyRateInr: number | null;
  peakRateInr: number | null;
  peakStartHour: number;
  peakEndHour: number;
  offerTitle: string | null;
  offerDescription: string | null;
  offerDiscountPercent: number | null;
  updatedAt: string;
}

export interface FacilityRecord {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string;
  specs: string;
  confirmed: boolean;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: 'Turf' | 'Matches' | 'Night Football' | 'Celebrations' | 'Action';
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export interface PromotionRecord {
  id: number;
  title: string;
  code: string;
  description: string;
  discountText: string;
  active: boolean;
  createdAt: string;
}

export interface TestimonialRecord {
  id: number;
  authorName: string;
  teamOrRole: string;
  rating: number;
  quote: string;
  bookingRef: string | null;
  approved: boolean;
  createdAt: string;
}

export interface EnquiryRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'new' | 'replied';
  createdAt: string;
}

export interface PublicSiteData {
  pricing: PricingConfig;
  facilities: FacilityRecord[];
  gallery: GalleryItem[];
  promotions: PromotionRecord[];
  testimonials: TestimonialRecord[];
  googleMapsEmbedUrl: string;
  stats: {
    confirmedBookingsCount: number;
  };
}

export interface SlotAvailability {
  hour: number;
  label: string;
  status: 'available' | 'booked' | 'blocked';
  reason?: string;
  isPeak: boolean;
  rateInr: number | null;
}
