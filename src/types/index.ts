// Central TypeScript interfaces and type declarations for Annapurna Foundation v2.0

export type UserRole = "visitor" | "donor" | "volunteer" | "ngo" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "donor" | "restaurant" | "caterer" | "ngo" | "volunteer";
  earnings?: number;
  upi_id?: string;
  aadhaar?: string;
  createdAt: Date;
}

export interface UserRoleMapping {
  userId: string;
  role: UserRole;
}

export interface PartnerNGO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  registrationNumber: string;
  createdAt: Date;
}

export interface Beneficiary {
  id: string;
  ngoId?: string;
  name: string;
  phone?: string;
  address: string;
  createdAt: Date;
}

export interface VolunteerApplication {
  id: string;
  userId: string;
  aadhaar: string;
  upiId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface VolunteerAssignment {
  id: string;
  volunteerId?: string;
  foodDonationId?: string;
  deliveryLocation: string;
  status: 
    | "pending"
    | "assigned"
    | "accepted"
    | "travelling_to_donor"
    | "food_collected"
    | "travelling_to_beneficiary"
    | "delivered"
    | "completed"
    | "cancelled";
  createdAt: Date;
}

export interface VolunteerCompensation {
  id: string;
  assignmentId: string;
  volunteerId?: string;
  distanceKm: number;
  ratePerKm: number;
  amount: number;
  status: "pending" | "paid";
  createdAt: Date;
}

export interface MonetaryDonation {
  id: string;
  donorId?: string;
  donorName: string;
  amount: number;
  currency: string;
  status: string;
  paymentId?: string;
  createdAt: Date;
}

export interface FoodDonation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  location: string;
  donorId?: string;
  donorName: string;
  donorType: "individual" | "restaurant" | "caterer";
  foodType: "veg" | "non-veg";
  foodImageUrl?: string;
  status: 
    | "pending_pickup" 
    | "pickup_assigned" 
    | "at_warehouse" 
    | "pending_delivery" 
    | "delivery_assigned" 
    | "delivered" 
    | "donated_to_animals";
  pickupDistanceKm?: number;
  etaMinutes?: number;
  qualityPassed?: boolean;
  volunteerId?: string;
  createdAt: Date;
}

export interface DonationReceipt {
  id: string;
  monetaryDonationId?: string;
  foodDonationId?: string;
  receiptNumber: string;
  pdfUrl: string;
  createdAt: Date;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  imageUrl?: string;
  authorId?: string;
  categoryId?: string;
  status: "draft" | "published";
  createdAt: Date;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: Date;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: Date;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  details?: string;
  createdAt: Date;
}
