import { z } from "zod";

// 1. Authentication Schemas
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phone: z.string().regex(/^[0-9]{10}$/, { message: "Phone number must be exactly 10 digits." }),
  aadhaar: z.string().regex(/^[0-9]{12}$/, { message: "Aadhaar number must be exactly 12 digits." }),
  upiId: z.string().min(3, { message: "Please enter a valid UPI ID (e.g. name@upi)." }),
});

// 2. Donation Schemas
export const foodDonationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  quantity: z.string().min(2, { message: "Please specify servings or quantity details." }),
  location: z.string().min(5, { message: "Please specify a detailed address." }),
  donorType: z.enum(["individual", "restaurant", "caterer"]),
  foodType: z.enum(["veg", "non-veg"]),
  foodImageUrl: z.string().url().optional().or(z.literal("")),
});

export const monetaryDonationSchema = z.object({
  donorName: z.string().min(2, { message: "Donor name must be at least 2 characters." }),
  amount: z.number().positive({ message: "Donation amount must be greater than 0." }),
  email: z.string().email({ message: "Please enter a valid email to receive the receipt." }),
});

// 3. Volunteer Application Schema
export const volunteerApplicationSchema = z.object({
  aadhaar: z.string().regex(/^[0-9]{12}$/, { message: "Aadhaar number must be exactly 12 digits." }),
  upiId: z.string().min(3, { message: "Please enter a valid UPI ID." }),
});

// 4. Content Schemas
export const blogSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  content: z.string().min(20, { message: "Content must be at least 20 characters." }),
  categoryId: z.string().uuid({ message: "Please select a valid category." }).optional(),
  status: z.enum(["draft", "published"]),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const eventSchema = z.object({
  title: z.string().min(5, { message: "Event title must be at least 5 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  date: z.date({ required_error: "Please select an event date." }),
  location: z.string().min(3, { message: "Please enter a location or venue." }),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const faqSchema = z.object({
  question: z.string().min(10, { message: "Question must be at least 10 characters." }),
  answer: z.string().min(10, { message: "Answer must be at least 10 characters." }),
  category: z.string().min(2, { message: "Please specify a category." }),
});

// 5. Contact Form Schema
export const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});
